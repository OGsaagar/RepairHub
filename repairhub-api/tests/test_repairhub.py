from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from rest_framework.test import APIClient

from apps.ai.models import AIAudit
from apps.ai.services import analyze_damage
from apps.catalog.models import PricingRule, RepairerService, ServiceCategory
from apps.payments.models import PayoutLedgerEntry
from apps.payments.services import create_payout_entry, release_payout
from apps.repairers.models import RepairerProfile
from apps.repairs.models import Booking, RepairMatch, RepairRequest
from apps.repairs.services import build_matches
from apps.rewards.models import RewardLedger
from apps.rewards.services import award_points

User = get_user_model()


@pytest.mark.django_db
def test_repair_requests_require_authentication():
    client = APIClient()
    response = client.get("/api/repair-requests/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_public_registration_rejects_admin_role():
    client = APIClient()

    response = client.post(
        "/api/auth/register/",
        {
            "email": "admin-candidate@example.com",
            "password": "password123",
            "first_name": "Admin",
            "last_name": "Candidate",
            "role": "admin",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "Admin accounts cannot be created" in response.json()["role"][0]


@pytest.mark.django_db
def test_login_returns_user_payload_with_role():
    user = User.objects.create_user(
        username="customer@example.com",
        email="customer@example.com",
        password="password123",
        role="customer",
        profile_status="active",
    )
    client = APIClient()

    response = client.post(
        "/api/auth/login/",
        {"email": user.email, "password": "password123"},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["user"]["role"] == "customer"


@pytest.mark.django_db
def test_repair_request_create_accepts_category_slug_and_photo_urls():
    user = User.objects.create_user(
        username="requester@example.com",
        email="requester@example.com",
        password="password123",
        role="customer",
        profile_status="active",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/repair-requests/",
        {
            "category_slug": "electronics",
            "item_name": "Pixel 8",
            "issue_description": "Screen flickers after a drop.",
            "urgency": "standard",
            "pickup_preference": "dropoff",
            "photo_urls": ["https://local.repairhub.dev/uploads/pixel-screen.png"],
        },
        format="json",
    )

    assert response.status_code == 201
    repair_request = RepairRequest.objects.get(id=response.json()["id"])
    assert repair_request.category.slug == "electronics"
    assert repair_request.photos.count() == 1


@pytest.mark.django_db
def test_match_generation_uses_service_catalog_and_rules():
    customer = User.objects.create_user(username="customer", email="customer@example.com", password="password123", role="customer", profile_status="active")
    repairer_user = User.objects.create_user(username="repairer", email="repairer@example.com", password="password123", role="repairer", profile_status="active")
    category = ServiceCategory.objects.create(name="Electronics", slug="electronics")
    profile = RepairerProfile.objects.create(
        user=repairer_user,
        headline="Phone specialist",
        city="Brooklyn",
        service_radius_km=Decimal("15.0"),
        rating=Decimal("4.90"),
        verification_status="verified",
    )
    service = RepairerService.objects.create(
        repairer=profile,
        category=category,
        title="Phone screen repair",
        description="OLED and LCD screen replacements",
        min_price=Decimal("80.00"),
        max_price=Decimal("120.00"),
        warranty_days=7,
        turnaround_hours=4,
    )
    PricingRule.objects.create(service=service, damage_band="screen", urgency="standard", multiplier=Decimal("1.00"), flat_fee=Decimal("5.00"))
    repair_request = RepairRequest.objects.create(
        customer=customer,
        category=category,
        item_name="iPhone 14 Pro",
        issue_description="Cracked screen and touch issues",
        status="matching",
    )

    matches = build_matches(repair_request)

    assert len(matches) == 1
    assert matches[0].quote_amount == Decimal("105.00")
    assert matches[0].repairer == profile


@pytest.mark.django_db
def test_matches_endpoint_rebuilds_stale_invalid_match_cache_rows():
    customer = User.objects.create_user(
        username="customer-stale",
        email="customer-stale@example.com",
        password="password123",
        role="customer",
        profile_status="active",
    )
    repairer_user = User.objects.create_user(
        username="repairer-stale",
        email="repairer-stale@example.com",
        password="password123",
        role="repairer",
        profile_status="active",
    )
    category = ServiceCategory.objects.create(name="Electronics", slug="electronics")
    profile = RepairerProfile.objects.create(
        user=repairer_user,
        headline="Phone specialist",
        city="Sydney",
        service_radius_km=Decimal("18.0"),
        rating=Decimal("4.90"),
        verification_status="verified",
    )
    service = RepairerService.objects.create(
        repairer=profile,
        category=category,
        title="Phone screen repair",
        description="OLED and LCD screen replacements",
        min_price=Decimal("80.00"),
        max_price=Decimal("120.00"),
        warranty_days=7,
        turnaround_hours=4,
    )
    PricingRule.objects.create(
        service=service,
        damage_band="screen",
        urgency="standard",
        multiplier=Decimal("1.00"),
        flat_fee=Decimal("5.00"),
    )
    repair_request = RepairRequest.objects.create(
        customer=customer,
        category=category,
        item_name="iPhone 14 Pro",
        issue_description="Cracked screen and touch issues",
        status="matching",
    )
    stale_match = RepairMatch.objects.create(
        repair_request=repair_request,
        repairer=profile,
        service=service,
        score=Decimal("1.00"),
        distance_km=Decimal("1.00"),
        quote_amount=Decimal("105.00"),
        eta_hours=4,
        ranking_reason="Stale cache row",
    )
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE repairs_repairmatch SET score = %s, distance_km = %s WHERE id = %s",
            ["-15883.86", "15988.76", str(stale_match.id)],
        )

    client = APIClient()
    client.force_authenticate(user=customer)

    response = client.get(f"/api/repair-requests/{repair_request.id}/matches/")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert Decimal(payload[0]["distance_km"]) <= Decimal("18.0")
    assert Decimal(payload[0]["score"]) >= Decimal("0.0")
    assert payload[0]["quote_amount"] == "105.00"


@pytest.mark.django_db
def test_ai_fallback_creates_audit_row(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = analyze_damage(
        item_name="iPhone 14 Pro",
        issue_description="Cracked screen",
        photo_urls=[],
    )

    assert response["damage_type"] == "Cracked screen + LCD damage"
    assert AIAudit.objects.filter(fallback_used=True).exists()


@pytest.mark.django_db
def test_payout_release_transitions_entry():
    customer = User.objects.create_user(username="customer2", email="customer2@example.com", password="password123", role="customer", profile_status="active")
    repairer_user = User.objects.create_user(username="repairer2", email="repairer2@example.com", password="password123", role="repairer", profile_status="active")
    category = ServiceCategory.objects.create(name="Clothing", slug="clothing")
    profile = RepairerProfile.objects.create(
        user=repairer_user,
        headline="Tailor",
        city="Queens",
        service_radius_km=Decimal("8.0"),
        rating=Decimal("4.80"),
        verification_status="verified",
    )
    repair_request = RepairRequest.objects.create(
        customer=customer,
        category=category,
        item_name="Leather Jacket",
        issue_description="Replace the zipper",
        status="booked",
        estimated_max_cost=Decimal("40.00"),
    )
    booking = Booking.objects.create(
        repair_request=repair_request,
        repairer=profile,
        subtotal_amount=Decimal("40.00"),
        platform_fee_amount=Decimal("2.00"),
        total_amount=Decimal("42.00"),
    )

    entry = create_payout_entry(booking)
    released = release_payout(entry)

    assert released.status == PayoutLedgerEntry.Status.RELEASED


@pytest.mark.django_db
def test_award_points_records_ledger_entry():
    user = User.objects.create_user(username="points", email="points@example.com", password="password123", role="customer", profile_status="active")

    entry = award_points(user, action="review_submitted", points_override=25)

    assert entry.points == 25
    assert RewardLedger.objects.filter(user=user, action="review_submitted").count() == 1
