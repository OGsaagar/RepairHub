from rest_framework import permissions, serializers, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin_ops.models import AdminAuditLog
from apps.community.models import ForumThread
from apps.payments.models import PayoutLedgerEntry
from apps.repairers.models import RepairerApplication


class AdminAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminAuditLog
        fields = "__all__"


class AdminAuditLogViewSet(viewsets.ModelViewSet):
    queryset = AdminAuditLog.objects.all().order_by("-created_at")
    serializer_class = AdminAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]


class OpsDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "pending_applications": RepairerApplication.objects.filter(status="pending").count(),
                "pending_payouts": PayoutLedgerEntry.objects.filter(status="held").count(),
                "forum_flags": ForumThread.objects.filter(is_flagged=True).count(),
            }
        )
