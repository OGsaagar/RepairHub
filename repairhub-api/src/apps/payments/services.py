from __future__ import annotations

from decimal import Decimal

from apps.payments.models import PayoutLedgerEntry
from apps.repairs.models import Booking


def create_booking_financials(validated_data: dict[str, object]) -> dict[str, Decimal]:
    repair_request = validated_data["repair_request"]
    selected_quote_amount = Decimal(getattr(repair_request, "selected_quote_amount", 0) or 0)
    subtotal = selected_quote_amount or Decimal(getattr(repair_request, "estimated_max_cost", 95) or 95)
    platform_fee = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
    total = subtotal + platform_fee
    return {
        "subtotal_amount": subtotal,
        "platform_fee_amount": platform_fee,
        "total_amount": total,
    }


def create_payout_entry(booking: Booking) -> PayoutLedgerEntry:
    return PayoutLedgerEntry.objects.create(
        repairer=booking.repairer,
        booking=booking,
        gross_amount=booking.subtotal_amount,
        platform_fee=booking.platform_fee_amount,
        net_amount=booking.subtotal_amount - booking.platform_fee_amount,
    )


def release_payout(entry: PayoutLedgerEntry) -> PayoutLedgerEntry:
    entry.status = PayoutLedgerEntry.Status.RELEASED
    entry.save(update_fields=["status", "updated_at"])
    return entry
