from django.contrib.auth import get_user_model
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "profile_status")


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("email", "first_name", "last_name")

    def validate_email(self, value):
        normalized_email = value.lower()
        if User.objects.exclude(pk=self.instance.pk).filter(email__iexact=normalized_email).exists():
            msg = "A user with this email already exists."
            raise serializers.ValidationError(msg)
        return normalized_email

    def update(self, instance, validated_data):
        email = validated_data.get("email", instance.email).lower()
        instance.email = email
        instance.username = email
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.save(update_fields=["email", "username", "first_name", "last_name", "updated_at"])
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "password", "first_name", "last_name", "role")

    def validate_role(self, value):
        if value == User.Role.ADMIN:
            msg = "Admin accounts cannot be created from the public registration flow."
            raise serializers.ValidationError(msg)
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        user = User(
            username=email,
            email=email,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=validated_data.get("role", User.Role.CUSTOMER),
            profile_status=User.ProfileStatus.ACTIVE
            if validated_data.get("role") == User.Role.CUSTOMER
            else User.ProfileStatus.PENDING,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "")
        return Response({"detail": f"Password reset email queued for {email}."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        return Response({"detail": "Password reset confirmed."})
