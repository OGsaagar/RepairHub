from rest_framework import permissions, serializers, viewsets

from apps.repairers.models import RepairerApplication, RepairerProfile
from common.permissions import IsAdminRole


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

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
