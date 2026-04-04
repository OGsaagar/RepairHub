from uuid import uuid4

import cloudinary
from cloudinary.utils import api_sign_request
from django.utils.text import slugify
from rest_framework import decorators, permissions, serializers, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.services import analyze_damage
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
            "created_at",
            "updated_at",
        )

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
    class Meta:
        model = Booking
        fields = "__all__"


class RepairJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairJob
        fields = "__all__"


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = "__all__"


class RepairRequestViewSet(viewsets.ModelViewSet):
    queryset = RepairRequest.objects.select_related("customer", "category").prefetch_related("photos", "matches")
    serializer_class = RepairRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

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


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("repair_request", "repairer").all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
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
    queryset = RepairJob.objects.select_related("booking", "customer", "repairer").all()
    serializer_class = RepairJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    @decorators.action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        job = self.get_object()
        status_value = request.data.get("status", RepairRequest.Status.IN_REPAIR)
        latest_update = request.data.get("latest_update", "")
        transition_job(job, status_value, latest_update)
        return Response(self.get_serializer(job).data)

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
