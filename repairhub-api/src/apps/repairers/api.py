from decimal import Decimal

from rest_framework import decorators, permissions, serializers, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.models import User
from apps.catalog.models import RepairerService, ServiceCategory
from apps.repairers.models import RepairerApplication, RepairerProfile
from common.permissions import IsAdminRole

DEFAULT_CATEGORY_SERVICE_CONFIG = {
    "electronics": {
        "title": "Electronics repair service",
        "description": "Diagnostics and repairs for consumer electronics.",
        "min_price": Decimal("80.00"),
        "max_price": Decimal("120.00"),
        "warranty_days": 7,
        "turnaround_hours": 4,
    },
    "furniture": {
        "title": "Furniture repair service",
        "description": "Structural repair and restoration for household furniture.",
        "min_price": Decimal("60.00"),
        "max_price": Decimal("180.00"),
        "warranty_days": 14,
        "turnaround_hours": 24,
    },
    "clothing": {
        "title": "Clothing repair service",
        "description": "Alterations, mending, and garment restoration.",
        "min_price": Decimal("30.00"),
        "max_price": Decimal("75.00"),
        "warranty_days": 14,
        "turnaround_hours": 12,
    },
    "bikes": {
        "title": "Bike repair service",
        "description": "Repairs and tune-ups for commuter and road bikes.",
        "min_price": Decimal("35.00"),
        "max_price": Decimal("95.00"),
        "warranty_days": 7,
        "turnaround_hours": 8,
    },
}


def get_default_service_config(category: ServiceCategory) -> dict[str, object]:
    config = DEFAULT_CATEGORY_SERVICE_CONFIG.get(category.slug)
    if config is not None:
        return config

    return {
        "title": f"{category.name} repair service",
        "description": f"General repair support for {category.name.lower()} items.",
        "min_price": Decimal("50.00"),
        "max_price": Decimal("150.00"),
        "warranty_days": 7,
        "turnaround_hours": 24,
    }


class RepairerApplicationSerializer(serializers.ModelSerializer):
    applicant_email = serializers.EmailField(source="applicant.email", read_only=True)

    class Meta:
        model = RepairerApplication
        fields = "__all__"


class RepairerProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = RepairerProfile
        fields = "__all__"
        read_only_fields = (
            "id",
            "user",
            "user_email",
            "rating",
            "reviews_count",
            "verification_status",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        is_online = attrs.get("is_online")
        if self.instance is not None and is_online is None:
            is_online = self.instance.is_online

        if is_online:
            required_fields = {
                "headline": "Add a repair headline before going online.",
                "city": "Add your city before going online.",
                "shop_name": "Add your shop name before going online.",
                "shop_address": "Add your shop address before going online.",
                "shop_phone": "Add your shop phone before going online.",
                "shop_opening_hours": "Add your shop opening hours before going online.",
            }
            errors: dict[str, str] = {}
            for field_name, message in required_fields.items():
                value = attrs.get(field_name)
                if value is None and self.instance is not None:
                    value = getattr(self.instance, field_name, "")
                if not str(value or "").strip():
                    errors[field_name] = message

            service_radius = attrs.get("service_radius_km")
            if service_radius is None and self.instance is not None:
                service_radius = self.instance.service_radius_km
            if service_radius is None or service_radius <= 0:
                errors["service_radius_km"] = "Service radius must be greater than 0 km."

            if errors:
                raise serializers.ValidationError(errors)

        return attrs


class RepairerAccountSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    repairer_profile = RepairerProfileSerializer(read_only=True)
    primary_category_id = serializers.SerializerMethodField()
    primary_category_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "profile_status",
            "repairer_profile",
            "primary_category_id",
            "primary_category_name",
        )

    def get_full_name(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name or obj.email

    def _get_profile(self, obj):
        try:
            return obj.repairer_profile
        except RepairerProfile.DoesNotExist:
            return None

    def get_primary_category_id(self, obj):
        profile = self._get_profile(obj)
        if profile is None:
            return None
        service = profile.services.filter(is_active=True).select_related("category").order_by("created_at").first()
        return str(service.category_id) if service else None

    def get_primary_category_name(self, obj):
        profile = self._get_profile(obj)
        if profile is None:
            return None
        service = profile.services.filter(is_active=True).select_related("category").order_by("created_at").first()
        return service.category.name if service else None


class AdminRepairerProfileUpsertSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    category_id = serializers.UUIDField()
    headline = serializers.CharField(max_length=255)
    bio = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(max_length=120)
    shop_name = serializers.CharField(max_length=255)
    shop_address = serializers.CharField(max_length=255)
    shop_phone = serializers.CharField(max_length=40)
    shop_opening_hours = serializers.CharField(max_length=255)
    service_radius_km = serializers.DecimalField(max_digits=5, decimal_places=1)

    def validate_user_id(self, value):
        user = User.objects.filter(id=value, role=User.Role.REPAIRER).first()
        if user is None:
            raise serializers.ValidationError("Choose a repairer account that already exists in the database.")
        self.context["repairer_user"] = user
        return value

    def validate_category_id(self, value):
        category = ServiceCategory.objects.filter(id=value).first()
        if category is None:
            raise serializers.ValidationError("Choose a repair category that already exists in the database.")
        self.context["service_category"] = category
        return value


class RepairerApplicationViewSet(viewsets.ModelViewSet):
    queryset = RepairerApplication.objects.select_related("applicant").all()
    serializer_class = RepairerApplicationSerializer

    def get_permissions(self):
        if self.action in {"list", "destroy"}:
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(applicant=self.request.user)


class RepairerProfileViewSet(viewsets.ModelViewSet):
    queryset = RepairerProfile.objects.select_related("user").all()
    serializer_class = RepairerProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action == "me":
            return [permissions.IsAuthenticated()]
        if self.action in {"repairer_accounts", "admin_upsert_profile"}:
            return [IsAdminRole()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @decorators.action(detail=False, methods=["get", "post", "patch"], url_path="me")
    def me(self, request):
        if request.user.role not in {User.Role.REPAIRER, User.Role.ADMIN}:
            raise PermissionDenied("Only repairers can manage the online shop profile.")

        profile = RepairerProfile.objects.filter(user=request.user).first()
        if request.method == "GET":
            if profile is None:
                return Response(None, status=status.HTTP_200_OK)
            return Response(self.get_serializer(profile).data)

        raise PermissionDenied("Repairer shop details can only be added from the admin surface.")

    @decorators.action(detail=False, methods=["get"], url_path="admin/repairer-accounts")
    def repairer_accounts(self, request):
        accounts = (
            User.objects.filter(role=User.Role.REPAIRER)
            .select_related("repairer_profile")
            .prefetch_related("repairer_profile__services__category")
            .order_by("email")
        )
        return Response(RepairerAccountSerializer(accounts, many=True).data)

    @decorators.action(detail=False, methods=["post"], url_path="admin/upsert-profile")
    def admin_upsert_profile(self, request):
        serializer = AdminRepairerProfileUpsertSerializer(data=request.data, context={})
        serializer.is_valid(raise_exception=True)
        repairer_user = serializer.context["repairer_user"]
        category = serializer.context["service_category"]
        validated = serializer.validated_data

        profile, created = RepairerProfile.objects.update_or_create(
            user=repairer_user,
            defaults={
                "headline": validated["headline"],
                "bio": validated.get("bio", ""),
                "city": validated["city"],
                "shop_name": validated["shop_name"],
                "shop_address": validated["shop_address"],
                "shop_phone": validated["shop_phone"],
                "shop_opening_hours": validated["shop_opening_hours"],
                "service_radius_km": validated["service_radius_km"],
                "is_online": True,
                "verification_status": RepairerProfile.VerificationStatus.VERIFIED,
            },
        )
        service_defaults = get_default_service_config(category)
        service_title = validated["headline"].strip() or str(service_defaults["title"])
        service_description = validated.get("bio", "").strip() or str(service_defaults["description"])
        RepairerService.objects.filter(repairer=profile).exclude(category=category).update(is_active=False)
        RepairerService.objects.update_or_create(
            repairer=profile,
            category=category,
            defaults={
                "title": service_title,
                "description": service_description,
                "min_price": service_defaults["min_price"],
                "max_price": service_defaults["max_price"],
                "warranty_days": service_defaults["warranty_days"],
                "turnaround_hours": service_defaults["turnaround_hours"],
                "is_active": True,
            },
        )
        return Response(
            self.get_serializer(profile).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
