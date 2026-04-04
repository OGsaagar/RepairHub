from rest_framework import permissions, serializers, viewsets

from apps.rewards.models import RewardLedger, RewardRule


class RewardRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardRule
        fields = "__all__"


class RewardLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardLedger
        fields = "__all__"


class RewardRuleViewSet(viewsets.ModelViewSet):
    queryset = RewardRule.objects.all()
    serializer_class = RewardRuleSerializer
    permission_classes = [permissions.IsAuthenticated]


class RewardLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RewardLedger.objects.select_related("user").all()
    serializer_class = RewardLedgerSerializer
    permission_classes = [permissions.IsAuthenticated]
