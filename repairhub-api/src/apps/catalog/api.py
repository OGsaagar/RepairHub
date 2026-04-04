from rest_framework import permissions, serializers, viewsets

from apps.catalog.models import PricingRule, RepairerService, ServiceCategory

DEFAULT_SERVICE_CATEGORIES = (
    {"name": "Electronics", "slug": "electronics", "icon": "electronics"},
    {"name": "Furniture", "slug": "furniture", "icon": "furniture"},
    {"name": "Clothing", "slug": "clothing", "icon": "clothing"},
    {"name": "Bikes", "slug": "bikes", "icon": "bikes"},
)


def ensure_default_service_categories() -> None:
    for category in DEFAULT_SERVICE_CATEGORIES:
        ServiceCategory.objects.get_or_create(
            slug=category["slug"],
            defaults={
                "name": category["name"],
                "icon": category["icon"],
            },
        )


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = "__all__"


class RepairerServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairerService
        fields = "__all__"


class PricingRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingRule
        fields = "__all__"


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        ensure_default_service_categories()
        return ServiceCategory.objects.all().order_by("name")


class RepairerServiceViewSet(viewsets.ModelViewSet):
    queryset = RepairerService.objects.select_related("repairer", "category").all()
    serializer_class = RepairerServiceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class PricingRuleViewSet(viewsets.ModelViewSet):
    queryset = PricingRule.objects.select_related("service").all()
    serializer_class = PricingRuleSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
