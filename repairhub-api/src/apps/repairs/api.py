from uuid import uuid4

import cloudinary
from cloudinary.utils import api_sign_request
from django.utils.text import slugify
from rest_framework import decorators, permissions, serializers, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.services import analyze_damage
from apps.accounts.models import User
from apps.catalog.models import ServiceCategory
from apps.payments.services import create_booking_financials, create_payout_entry
from apps.repairs.models import Booking, RepairJob, RepairMatch, RepairPhoto, RepairRequest, Review
from apps.repairs.services import attach_analysis, build_matches, transition_job
from apps.rewards.services import award_points


class RepairPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairPhoto
        fields = "__all__"


class RepairRequestSerializer(serializers.ModelSerializer):
    category_slug = serializers.CharField(write_only=True, required=False)
    category_name = serializers.CharField(source="category.name", read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(source="customer.email", read_only=True)
    selected_repairer_name = serializers.SerializerMethodField()
    selected_service_title = serializers.CharField(source="selected_service.title", read_only=True)
    photo_urls = serializers.ListField(
        child=serializers.URLField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    photos = RepairPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = RepairRequest
        fields = (
            "id",
            "customer",
            "customer_name",
            "customer_email",
            "category",
            "category_name",
            "category_slug",
            "item_name",
            "issue_description",
            "urgency",
            "pickup_preference",
            "status",
            "latitude",
            "longitude",
            "estimated_min_cost",
            "estimated_max_cost",
            "estimated_hours",
            "selected_repairer",
            "selected_repairer_name",
            "selected_service",
            "selected_service_title",
            "selected_quote_amount",
            "selection_status",
            "customer_selection_reason",
            "repairer_response_reason",
            "photo_urls",
            "photos",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "customer",
            "status",
            "estimated_min_cost",
            "estimated_max_cost",
            "estimated_hours",
            "selected_repairer",
            "selected_service",
            "selected_quote_amount",
            "selection_status",
            "customer_selection_reason",
            "repairer_response_reason",
            "created_at",
            "updated_at",
        )

    def get_customer_name(self, obj):
        full_name = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return full_name or obj.customer.email

    def get_selected_repairer_name(self, obj):
        if obj.selected_repairer is None:
            return None

        full_name = f"{obj.selected_repairer.user.first_name} {obj.selected_repairer.user.last_name}".strip()
        return full_name or obj.selected_repairer.user.email

    def validate(self, attrs):
        category_slug = attrs.pop("category_slug", "").strip()
        if attrs.get("category") is None and category_slug:
            category_name = category_slug.replace("-", " ").title()
            attrs["category"], _ = ServiceCategory.objects.get_or_create(
                slug=slugify(category_slug),
                defaults={
                    "name": category_name,
                    "icon": category_slug,
                },
            )
        return attrs

    def create(self, validated_data):
        photo_urls = validated_data.pop("photo_urls", [])
        repair_request = super().create(validated_data)
        RepairPhoto.objects.bulk_create(
            [
                RepairPhoto(
                    repair_request=repair_request,
                    image_url=image_url,
                    public_id=image_url.rsplit("/", 1)[-1],
                )
                for image_url in photo_urls
            ]
        )
        return repair_request


class RepairMatchSerializer(serializers.ModelSerializer):
    repairer_name = serializers.SerializerMethodField()
    repairer_city = serializers.CharField(source="repairer.city", read_only=True)
    repairer_rating = serializers.DecimalField(source="repairer.rating", max_digits=3, decimal_places=2, read_only=True)
    repairer_shop_name = serializers.CharField(source="repairer.shop_name", read_only=True)
    repairer_shop_address = serializers.CharField(source="repairer.shop_address", read_only=True)
    repairer_shop_phone = serializers.CharField(source="repairer.shop_phone", read_only=True)
    repairer_shop_opening_hours = serializers.CharField(source="repairer.shop_opening_hours", read_only=True)
    reviews_count = serializers.IntegerField(source="repairer.reviews_count", read_only=True)
    service_description = serializers.CharField(source="service.description", read_only=True)
    service_title = serializers.CharField(source="service.title", read_only=True)
    warranty_days = serializers.IntegerField(source="service.warranty_days", read_only=True)

    def get_repairer_name(self, obj):
        full_name = f"{obj.repairer.user.first_name} {obj.repairer.user.last_name}".strip()
        return full_name or obj.repairer.user.email

    class Meta:
        model = RepairMatch
        fields = (
            "id",
            "repair_request",
            "repairer",
            "repairer_name",
            "repairer_city",
            "repairer_rating",
            "repairer_shop_name",
            "repairer_shop_address",
            "repairer_shop_phone",
            "repairer_shop_opening_hours",
            "reviews_count",
            "service",
            "service_title",
            "service_description",
            "warranty_days",
            "score",
            "distance_km",
            "quote_amount",
            "eta_hours",
            "ranking_reason",
            "selected",
            "created_at",
            "updated_at",
        )


class BookingSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        repair_request = attrs["repair_request"]
        repairer = attrs["repairer"]

        if repair_request.selection_status != RepairRequest.SelectionStatus.APPROVED:
            raise ValidationError({"repair_request": "Repairer approval is required before payment."})

        if repair_request.selected_repairer_id != repairer.id:
            raise ValidationError({"repairer": "You can only book the approved repairer for this request."})

        return attrs

    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = (
            "id",
            "subtotal_amount",
            "platform_fee_amount",
            "total_amount",
            "payment_status",
            "created_at",
            "updated_at",
        )


class RepairJobSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="booking.repair_request.item_name", read_only=True)
    issue_description = serializers.CharField(source="booking.repair_request.issue_description", read_only=True)
    quote_amount = serializers.DecimalField(source="booking.subtotal_amount", max_digits=8, decimal_places=2, read_only=True)
    repair_request = serializers.UUIDField(source="booking.repair_request.id", read_only=True)
    customer_name = serializers.SerializerMethodField()
    repairer_name = serializers.SerializerMethodField()

    def get_customer_name(self, obj):
        full_name = f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return full_name or obj.customer.email

    def get_repairer_name(self, obj):
        full_name = f"{obj.repairer.user.first_name} {obj.repairer.user.last_name}".strip()
        return full_name or obj.repairer.user.email

    class Meta:
        model = RepairJob
        fields = (
            "id",
            "repair_request",
            "booking",
            "customer",
            "customer_name",
            "repairer",
            "repairer_name",
            "item_name",
            "issue_description",
            "quote_amount",
            "status",
            "reference_code",
            "estimated_ready_at",
            "latest_update",
            "created_at",
            "updated_at",
        )


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = "__all__"


class MatchSelectionSerializer(serializers.Serializer):
    match_id = serializers.UUIDField()
    customer_reason = serializers.CharField(min_length=10, trim_whitespace=True)


class RepairerDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=[("approved", "Approved"), ("rejected", "Rejected")])
    repairer_reason = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)

    def validate(self, attrs):
        if attrs["decision"] == "rejected" and not attrs.get("repairer_reason", "").strip():
            raise serializers.ValidationError({"repairer_reason": "A rejection reason is required."})
        return attrs


class RepairRequestViewSet(viewsets.ModelViewSet):
    queryset = RepairRequest.objects.select_related(
        "customer",
        "category",
        "selected_repairer__user",
        "selected_service",
    ).prefetch_related("photos", "matches")
    serializer_class = RepairRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.CUSTOMER:
            return queryset.filter(customer=user)
        if user.role == User.Role.REPAIRER:
            return queryset.filter(selected_repairer__user=user)
        return queryset.none()

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user, status=RepairRequest.Status.SUBMITTED)

    @decorators.action(detail=True, methods=["post"])
    def analyze(self, request, pk=None):
        repair_request = self.get_object()
        analysis_payload = analyze_damage(
            item_name=repair_request.item_name,
            issue_description=repair_request.issue_description,
            photo_urls=[photo.image_url for photo in repair_request.photos.all()],
        )
        analysis = attach_analysis(repair_request, analysis_payload)
        repair_request.status = RepairRequest.Status.MATCHING
        repair_request.save(update_fields=["status", "updated_at"])
        return Response({"repair_request": self.get_serializer(repair_request).data, "analysis": analysis.raw_payload})

    @decorators.action(detail=True, methods=["get"])
    def matches(self, request, pk=None):
        repair_request = self.get_object()
        matches = build_matches(repair_request)
        return Response(RepairMatchSerializer(matches, many=True).data)

    @decorators.action(detail=True, methods=["post"], url_path="select-match")
    def select_match(self, request, pk=None):
        if request.user.role not in {User.Role.CUSTOMER, User.Role.ADMIN}:
            raise PermissionDenied("Only customers can select a repairer.")

        repair_request = self.get_object()
        serializer = MatchSelectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        match = RepairMatch.objects.select_related("repairer", "service").filter(
            repair_request=repair_request,
            id=serializer.validated_data["match_id"],
        ).first()
        if match is None:
            build_matches(repair_request)
            match = RepairMatch.objects.select_related("repairer", "service").filter(
                repair_request=repair_request,
                id=serializer.validated_data["match_id"],
            ).first()
        if match is None:
            raise ValidationError({"match_id": "The selected repairer is not available for this repair category."})

        RepairMatch.objects.filter(repair_request=repair_request).update(selected=False)
        RepairMatch.objects.filter(id=match.id).update(selected=True)

        repair_request.selected_repairer = match.repairer
        repair_request.selected_service = match.service
        repair_request.selected_quote_amount = match.quote_amount
        repair_request.selection_status = RepairRequest.SelectionStatus.PENDING
        repair_request.customer_selection_reason = serializer.validated_data["customer_reason"]
        repair_request.repairer_response_reason = ""
        repair_request.status = RepairRequest.Status.MATCHED
        repair_request.save(
            update_fields=[
                "selected_repairer",
                "selected_service",
                "selected_quote_amount",
                "selection_status",
                "customer_selection_reason",
                "repairer_response_reason",
                "status",
                "updated_at",
            ]
        )
        repair_request.refresh_from_db()
        return Response(self.get_serializer(repair_request).data, status=status.HTTP_200_OK)

    @decorators.action(detail=True, methods=["post"], url_path="review-selection")
    def review_selection(self, request, pk=None):
        repair_request = self.get_object()
        if repair_request.selected_repairer is None:
            raise ValidationError({"detail": "No repairer has been selected for this request yet."})
        if request.user.role not in {User.Role.REPAIRER, User.Role.ADMIN}:
            raise PermissionDenied("Only repairers can review selected repair requests.")
        if request.user.role == User.Role.REPAIRER and repair_request.selected_repairer.user_id != request.user.id:
            raise PermissionDenied("You can only review requests assigned to you.")

        serializer = RepairerDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        approved = serializer.validated_data["decision"] == "approved"
        repair_request.selection_status = (
            RepairRequest.SelectionStatus.APPROVED if approved else RepairRequest.SelectionStatus.REJECTED
        )
        repair_request.repairer_response_reason = serializer.validated_data.get("repairer_reason", "")
        repair_request.save(update_fields=["selection_status", "repairer_response_reason", "updated_at"])
        repair_request.refresh_from_db()
        return Response(self.get_serializer(repair_request).data, status=status.HTTP_200_OK)

    @decorators.action(detail=False, methods=["get"], url_path="repairer-queue")
    def repairer_queue(self, request):
        if request.user.role not in {User.Role.REPAIRER, User.Role.ADMIN}:
            raise PermissionDenied("Only repairers can view the repairer queue.")

        queryset = self.get_queryset().exclude(selection_status=RepairRequest.SelectionStatus.NONE).order_by("-updated_at")
        return Response(self.get_serializer(queryset, many=True).data)


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("repair_request", "repairer").all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.CUSTOMER:
            return queryset.filter(repair_request__customer=user)
        if user.role == User.Role.REPAIRER:
            return queryset.filter(repairer__user=user)
        return queryset.none()

    def perform_create(self, serializer):
        repair_request = serializer.validated_data["repair_request"]
        if self.request.user.role not in {User.Role.CUSTOMER, User.Role.ADMIN}:
            raise PermissionDenied("Only customers can create a booking.")
        if self.request.user.role == User.Role.CUSTOMER and repair_request.customer_id != self.request.user.id:
            raise PermissionDenied("You can only book your own repair requests.")

        booking = serializer.save(**create_booking_financials(serializer.validated_data))
        repair_request = booking.repair_request
        repair_request.status = RepairRequest.Status.BOOKED
        repair_request.save(update_fields=["status", "updated_at"])
        RepairJob.objects.create(
            booking=booking,
            customer=repair_request.customer,
            repairer=booking.repairer,
            status=RepairRequest.Status.BOOKED,
            reference_code=f"RH-{str(uuid4().int)[:6]}",
            latest_update="Booking confirmed and awaiting dropoff scheduling.",
        )
        create_payout_entry(booking)


class RepairJobViewSet(viewsets.ModelViewSet):
    queryset = RepairJob.objects.select_related("booking", "booking__repair_request", "customer", "repairer", "repairer__user").all()
    serializer_class = RepairJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.CUSTOMER:
            return queryset.filter(customer=user)
        if user.role == User.Role.REPAIRER:
            return queryset.filter(repairer__user=user)
        return queryset.none()

    @decorators.action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        job = self.get_object()
        status_value = request.data.get("status", RepairRequest.Status.IN_REPAIR)
        latest_update = request.data.get("latest_update", "")
        allowed_statuses = {
            RepairRequest.Status.IN_REPAIR,
            RepairRequest.Status.READY,
            RepairRequest.Status.COLLECTED,
        }
        if request.user.role not in {User.Role.REPAIRER, User.Role.ADMIN}:
            raise PermissionDenied("Only repairers can update the repair status.")
        if request.user.role == User.Role.REPAIRER and job.repairer.user_id != request.user.id:
            raise PermissionDenied("You can only update your own jobs.")
        if status_value not in allowed_statuses:
            raise ValidationError({"status": "Repairers can only move jobs to In repair, Ready, or Collected."})
        if not latest_update:
            latest_update = {
                RepairRequest.Status.IN_REPAIR: "Repairer marked the item as in repair.",
                RepairRequest.Status.READY: "Repairer marked the item as ready for pickup or delivery.",
                RepairRequest.Status.COLLECTED: "Repairer confirmed the repaired item has been collected.",
            }[status_value]
        transition_job(job, status_value, latest_update)
        repair_request = job.booking.repair_request
        repair_request.status = status_value
        repair_request.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(job).data)

    @decorators.action(detail=False, methods=["get"], url_path="client-jobs")
    def client_jobs(self, request):
        jobs = self.get_queryset().filter(customer=request.user).order_by("-updated_at")
        return Response(self.get_serializer(jobs, many=True).data)

    @decorators.action(detail=False, methods=["get"], url_path="repairer-jobs")
    def repairer_jobs(self, request):
        jobs = self.get_queryset().filter(repairer__user=request.user).order_by("-updated_at")
        return Response(self.get_serializer(jobs, many=True).data)

    @decorators.action(detail=False, methods=["get"], url_path="client-summary")
    def client_summary(self, request):
        jobs = self.queryset.filter(customer=request.user)
        return Response(
            {
                "active_jobs": jobs.exclude(status=RepairRequest.Status.COMPLETED).count(),
                "completed_jobs": jobs.filter(status=RepairRequest.Status.COMPLETED).count(),
            }
        )

    @decorators.action(detail=False, methods=["get"], url_path="repairer-summary")
    def repairer_summary(self, request):
        jobs = self.queryset.filter(repairer__user=request.user)
        return Response(
            {
                "active_jobs": jobs.exclude(status=RepairRequest.Status.COMPLETED).count(),
                "completed_jobs": jobs.filter(status=RepairRequest.Status.COMPLETED).count(),
            }
        )


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related("job").all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        review = serializer.save()
        review.job.status = RepairRequest.Status.COMPLETED
        review.job.save(update_fields=["status", "updated_at"])
        award_points(review.job.customer, action="review_submitted", points_override=30)


class SignedUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        params = {
            "timestamp": request.data.get("timestamp", "0"),
            "folder": request.data.get("folder", "repairhub"),
        }
        api_secret = cloudinary.config().api_secret
        signature = api_sign_request(params, api_secret) if api_secret else "local-dev-signature"
        return Response(
            {
                "cloud_name": cloudinary.config().cloud_name,
                "api_key": cloudinary.config().api_key,
                "signature": signature,
                "params": params,
            }
        )
