import uuid

from django.db import models

from common.models import TimeStampedModel


class ServiceCategory(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=120, blank=True)

    def __str__(self) -> str:
        return self.name


class RepairerService(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repairer = models.ForeignKey("repairers.RepairerProfile", on_delete=models.CASCADE, related_name="services")
    category = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE, related_name="services")
    title = models.CharField(max_length=255)
    description = models.TextField()
    min_price = models.DecimalField(max_digits=8, decimal_places=2)
    max_price = models.DecimalField(max_digits=8, decimal_places=2)
    warranty_days = models.PositiveIntegerField(default=7)
    turnaround_hours = models.PositiveIntegerField(default=24)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.title


class PricingRule(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey(RepairerService, on_delete=models.CASCADE, related_name="pricing_rules")
    damage_band = models.CharField(max_length=120)
    urgency = models.CharField(max_length=40)
    multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=1)
    flat_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    def __str__(self) -> str:
        return f"{self.service.title} - {self.damage_band}"
