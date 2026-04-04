import uuid

from django.db import models

from common.models import TimeStampedModel


class PaymentRecord(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey("repairs.Booking", on_delete=models.CASCADE, related_name="payment_records")
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    currency = models.CharField(max_length=3, default="AUD")
    status = models.CharField(max_length=40, default="pending")


class PayoutLedgerEntry(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        HELD = "held", "Held"
        RELEASED = "released", "Released"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repairer = models.ForeignKey("repairers.RepairerProfile", on_delete=models.CASCADE, related_name="payout_entries")
    booking = models.ForeignKey("repairs.Booking", on_delete=models.CASCADE, related_name="payout_entries")
    gross_amount = models.DecimalField(max_digits=8, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=8, decimal_places=2)
    net_amount = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.HELD)
