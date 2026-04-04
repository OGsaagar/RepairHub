import uuid

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class RepairRequest(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        ANALYZED = "analyzed", "Analyzed"
        MATCHING = "matching", "Matching"
        MATCHED = "matched", "Matched"
        BOOKED = "booked", "Booked"
        AWAITING_DROPOFF = "awaiting_dropoff", "Awaiting dropoff"
        IN_REPAIR = "in_repair", "In repair"
        READY = "ready", "Ready"
        COLLECTED = "collected", "Collected"
        COMPLETED = "completed", "Completed"
        DISPUTED = "disputed", "Disputed"
        CANCELLED = "cancelled", "Cancelled"

    class Urgency(models.TextChoices):
        STANDARD = "standard", "Standard"
        URGENT = "urgent", "Urgent"
        FLEXIBLE = "flexible", "Flexible"

    class PickupPreference(models.TextChoices):
        DROPOFF = "dropoff", "Dropoff"
        PICKUP = "pickup", "Pickup"
        ONSITE = "onsite", "Onsite"

    class SelectionStatus(models.TextChoices):
        NONE = "none", "None"
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="repair_requests")
    category = models.ForeignKey("catalog.ServiceCategory", on_delete=models.SET_NULL, null=True, blank=True)
    item_name = models.CharField(max_length=255)
    issue_description = models.TextField()
    urgency = models.CharField(max_length=20, choices=Urgency.choices, default=Urgency.STANDARD)
    pickup_preference = models.CharField(
        max_length=20,
        choices=PickupPreference.choices,
        default=PickupPreference.DROPOFF,
    )
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, default=-33.868800)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, default=151.209300)
    estimated_min_cost = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    estimated_max_cost = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    estimated_hours = models.PositiveIntegerField(default=0)
    selected_repairer = models.ForeignKey(
        "repairers.RepairerProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="selected_repair_requests",
    )
    selected_service = models.ForeignKey(
        "catalog.RepairerService",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="selected_repair_requests",
    )
    selected_quote_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    selection_status = models.CharField(
        max_length=20,
        choices=SelectionStatus.choices,
        default=SelectionStatus.NONE,
    )
    customer_selection_reason = models.TextField(blank=True)
    repairer_response_reason = models.TextField(blank=True)


class RepairPhoto(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repair_request = models.ForeignKey(RepairRequest, on_delete=models.CASCADE, related_name="photos")
    image_url = models.URLField()
    public_id = models.CharField(max_length=255, blank=True)


class RepairAnalysis(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repair_request = models.OneToOneField(RepairRequest, on_delete=models.CASCADE, related_name="analysis")
    damage_type = models.CharField(max_length=255)
    severity = models.CharField(max_length=120)
    confidence = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    summary = models.TextField()
    replace_cost = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    waste_saved_kg = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    raw_payload = models.JSONField(default=dict, blank=True)


class RepairMatch(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repair_request = models.ForeignKey(RepairRequest, on_delete=models.CASCADE, related_name="matches")
    repairer = models.ForeignKey("repairers.RepairerProfile", on_delete=models.CASCADE, related_name="matches")
    service = models.ForeignKey("catalog.RepairerService", on_delete=models.CASCADE, related_name="matches")
    score = models.DecimalField(max_digits=8, decimal_places=2)
    distance_km = models.DecimalField(max_digits=8, decimal_places=2)
    quote_amount = models.DecimalField(max_digits=8, decimal_places=2)
    eta_hours = models.PositiveIntegerField(default=24)
    ranking_reason = models.CharField(max_length=255)
    selected = models.BooleanField(default=False)


class Booking(TimeStampedModel):
    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        AUTHORIZED = "authorized", "Authorized"
        PAID = "paid", "Paid"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repair_request = models.OneToOneField(RepairRequest, on_delete=models.CASCADE, related_name="booking")
    repairer = models.ForeignKey("repairers.RepairerProfile", on_delete=models.CASCADE, related_name="bookings")
    scheduled_for = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    subtotal_amount = models.DecimalField(max_digits=8, decimal_places=2)
    platform_fee_amount = models.DecimalField(max_digits=8, decimal_places=2)
    total_amount = models.DecimalField(max_digits=8, decimal_places=2)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)


class RepairJob(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="job")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="repair_jobs")
    repairer = models.ForeignKey("repairers.RepairerProfile", on_delete=models.CASCADE, related_name="repair_jobs")
    status = models.CharField(max_length=30, choices=RepairRequest.Status.choices, default=RepairRequest.Status.BOOKED)
    reference_code = models.CharField(max_length=20, unique=True)
    estimated_ready_at = models.DateTimeField(null=True, blank=True)
    latest_update = models.TextField(blank=True)


class Review(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.OneToOneField(RepairJob, on_delete=models.CASCADE, related_name="review")
    rating = models.PositiveIntegerField()
    comment = models.TextField(blank=True)
