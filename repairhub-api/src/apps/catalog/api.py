from rest_framework import permissions, serializers, viewsets

from apps.catalog.models import PricingRule, RepairerService, ServiceCategory


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


class RepairerServiceViewSet(viewsets.ModelViewSet):
    queryset = RepairerService.objects.select_related("repairer", "category").all()
    serializer_class = RepairerServiceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class PricingRuleViewSet(viewsets.ModelViewSet):
    queryset = PricingRule.objects.select_related("service").all()
    serializer_class = PricingRuleSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
