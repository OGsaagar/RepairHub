from rest_framework import permissions, serializers, viewsets

from apps.chat.models import JobMessage


class JobMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobMessage
        fields = "__all__"


class JobMessageViewSet(viewsets.ModelViewSet):
    queryset = JobMessage.objects.select_related("job", "sender").all()
    serializer_class = JobMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
