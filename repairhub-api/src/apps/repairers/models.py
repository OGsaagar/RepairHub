import uuid

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class RepairerApplication(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="repairer_applications")
    business_name = models.CharField(max_length=255)
    categories = models.CharField(max_length=255)
    bio = models.TextField(blank=True)
    years_experience = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewer_notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.business_name


class RepairerProfile(TimeStampedModel):
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        SUSPENDED = "suspended", "Suspended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="repairer_profile")
    headline = models.CharField(max_length=255)
    bio = models.TextField(blank=True)
    city = models.CharField(max_length=120)
    shop_name = models.CharField(max_length=255, blank=True)
    shop_address = models.CharField(max_length=255, blank=True)
    shop_phone = models.CharField(max_length=40, blank=True)
    shop_opening_hours = models.CharField(max_length=255, blank=True)
    service_radius_km = models.DecimalField(max_digits=5, decimal_places=1, default=10)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    reviews_count = models.PositiveIntegerField(default=0)
    is_online = models.BooleanField(default=False)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, default=-33.868800)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, default=151.209300)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )

    def __str__(self) -> str:
        return f"{self.user.email} ({self.city})"
