from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class RepairHubTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": str(self.user.id),
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "role": self.user.role,
            "profile_status": self.user.profile_status,
        }
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["user_id"] = str(user.id)
        token["role"] = user.role
        token["profile_status"] = user.profile_status
        return token


class RepairHubTokenObtainPairView(TokenObtainPairView):
    serializer_class = RepairHubTokenObtainPairSerializer
