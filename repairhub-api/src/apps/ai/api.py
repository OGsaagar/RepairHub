from rest_framework import permissions, serializers, viewsets

from apps.ai.models import AIAudit


class AIAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIAudit
        fields = "__all__"


class AIAuditViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AIAudit.objects.all().order_by("-created_at")
    serializer_class = AIAuditSerializer
    permission_classes = [permissions.IsAuthenticated]
