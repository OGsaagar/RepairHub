from rest_framework import permissions, serializers, viewsets

from apps.payments.models import PaymentRecord, PayoutLedgerEntry
from apps.payments.services import release_payout


class PaymentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentRecord
        fields = "__all__"


class PayoutLedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = PayoutLedgerEntry
        fields = "__all__"


class PaymentRecordViewSet(viewsets.ModelViewSet):
    queryset = PaymentRecord.objects.select_related("booking").all()
    serializer_class = PaymentRecordSerializer
    permission_classes = [permissions.IsAuthenticated]


class PayoutLedgerEntryViewSet(viewsets.ModelViewSet):
    queryset = PayoutLedgerEntry.objects.select_related("repairer", "booking").all()
    serializer_class = PayoutLedgerEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status == PayoutLedgerEntry.Status.RELEASED:
            release_payout(instance)
