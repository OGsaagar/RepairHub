from decimal import Decimal

import pytest
from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import Client
from rest_framework.test import APIClient

from apps.accounts.bootstrap import ensure_env_admin_account
from apps.ai.models import AIAudit
from apps.ai.services import analyze_damage
from apps.catalog.models import PricingRule, RepairerService, ServiceCategory
from apps.payments.models import PayoutLedgerEntry
from apps.payments.services import create_payout_entry, release_payout
from apps.repairers.models import RepairerProfile
from apps.repairs.models import Booking, RepairJob, RepairMatch, RepairRequest
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
def test_env_admin_credentials_can_log_into_django_admin(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "env-admin@example.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "EnvAdminPassword!2026")

    ensure_env_admin_account()

    user = User.objects.get(email="env-admin@example.com")
    assert user.role == User.Role.ADMIN
    assert user.profile_status == User.ProfileStatus.ACTIVE
    assert user.is_staff is True
    assert user.is_superuser is True
    assert user.check_password("EnvAdminPassword!2026") is True

    client = Client()
    login_page = client.get("/admins/login/")
    assert login_page.status_code == 200

    login_response = client.post(
        "/admins/login/?next=/admins/",
        {
            "username": "env-admin@example.com",
            "password": "EnvAdminPassword!2026",
        },
    )

    assert login_response.status_code == 302
    assert login_response["Location"].endswith("/admins/")


@pytest.mark.django_db
def test_all_project_models_are_registered_in_django_admin():
    from django.contrib import admin

    project_models = [
        model
        for model in django_apps.get_models()
        if django_apps.get_app_config(model._meta.app_label).name.startswith("apps.")
    ]

    assert project_models
    assert all(model in admin.site._registry for model in project_models)


@pytest.mark.django_db
def test_authenticated_user_can_update_own_profile():
    user = User.objects.create_user(
        username="profile-user@example.com",
        email="profile-user@example.com",
        password="password123",
        first_name="Elena",
        last_name="Adeyemi",
        role="customer",
        profile_status="active",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        "/api/auth/me/",
        {
            "email": "updated-profile@example.com",
            "first_name": "Nadia",
            "last_name": "Okafor",
        },
        format="json",
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.email == "updated-profile@example.com"
    assert user.username == "updated-profile@example.com"
    assert user.first_name == "Nadia"
    assert user.last_name == "Okafor"
    assert user.role == "customer"
    assert response.json()["role"] == "customer"


@pytest.mark.django_db
def test_service_categories_endpoint_includes_default_categories():
    client = APIClient()

    response = client.get("/api/service-categories/")

    assert response.status_code == 200
    category_names = {item["name"] for item in response.json()}
    assert {"Electronics", "Furniture", "Clothing", "Bikes"}.issubset(category_names)


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
        is_online=True,
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
        shop_name="Sydney Screen Lab",
        shop_address="10 Market Street, Sydney NSW 2000",
        shop_phone="+61 2 9000 1111",
        shop_opening_hours="Mon-Sat, 9:00 am - 5:00 pm",
        is_online=True,
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
    assert payload[0]["repairer_shop_name"] == "Sydney Screen Lab"
    assert payload[0]["repairer_shop_address"] == "10 Market Street, Sydney NSW 2000"


@pytest.mark.django_db
def test_customer_selection_requires_repairer_approval_before_completion_payment():
    customer = User.objects.create_user(username="customer-approval", email="customer-approval@example.com", password="password123", role="customer", profile_status="active")
    repairer_user = User.objects.create_user(username="repairer-approval", email="repairer-approval@example.com", password="password123", role="repairer", profile_status="active")
    category = ServiceCategory.objects.create(name="Furniture", slug="furniture")
    profile = RepairerProfile.objects.create(
        user=repairer_user,
        headline="Furniture specialist",
        city="Sydney",
        service_radius_km=Decimal("18.0"),
        rating=Decimal("4.80"),
        is_online=True,
        verification_status="verified",
    )
    service = RepairerService.objects.create(
        repairer=profile,
        category=category,
        title="Chair restoration",
        description="Chair repair and structural reinforcement",
        min_price=Decimal("90.00"),
        max_price=Decimal("140.00"),
        warranty_days=14,
        turnaround_hours=12,
    )
    PricingRule.objects.create(service=service, damage_band="general", urgency="standard", multiplier=Decimal("1.00"), flat_fee=Decimal("10.00"))
    repair_request = RepairRequest.objects.create(
        customer=customer,
        category=category,
        item_name="Dining Chair",
        issue_description="The rear leg joint is loose and wobbles under weight.",
        status="matching",
        estimated_max_cost=Decimal("120.00"),
    )
    match = build_matches(repair_request)[0]

    customer_client = APIClient()
    customer_client.force_authenticate(user=customer)

    selection_response = customer_client.post(
        f"/api/repair-requests/{repair_request.id}/select-match/",
        {
            "match_id": str(match.id),
            "customer_reason": "The chair is unsafe to use and I need the joint reinforced before it fails completely.",
        },
        format="json",
    )

    assert selection_response.status_code == 200
    repair_request.refresh_from_db()
    assert repair_request.selection_status == RepairRequest.SelectionStatus.PENDING
    assert repair_request.selected_repairer == profile

    blocked_booking = customer_client.post(
        "/api/bookings/",
        {
            "repair_request": str(repair_request.id),
            "repairer": str(profile.id),
            "notes": "Please collect this from the front office.",
        },
        format="json",
    )

    assert blocked_booking.status_code == 400
    assert blocked_booking.json()["repair_request"][0] == "Repairer approval is required before payment."

    repairer_client = APIClient()
    repairer_client.force_authenticate(user=repairer_user)
    approval_response = repairer_client.post(
        f"/api/repair-requests/{repair_request.id}/review-selection/",
        {
            "decision": "approved",
            "repairer_reason": "I can take this repair and start tomorrow morning.",
        },
        format="json",
    )

    assert approval_response.status_code == 200
    repair_request.refresh_from_db()
    assert repair_request.selection_status == RepairRequest.SelectionStatus.APPROVED
    booking = Booking.objects.get(repair_request=repair_request)
    assert booking.payment_status == Booking.PaymentStatus.PENDING
    job = RepairJob.objects.get(booking=booking)
    assert job.status == RepairRequest.Status.BOOKED

    active_work_response = repairer_client.post(
        f"/api/jobs/{job.id}/transition/",
        {
            "status": RepairRequest.Status.IN_REPAIR,
            "latest_update": "Repairer started active work on the chair frame and joint reinforcement.",
        },
        format="json",
    )

    assert active_work_response.status_code == 200
    repair_request.refresh_from_db()
    assert repair_request.status == RepairRequest.Status.IN_REPAIR

    client_jobs_response = customer_client.get("/api/jobs/client-jobs/")
    assert client_jobs_response.status_code == 200
    assert client_jobs_response.json()[0]["status"] == RepairRequest.Status.IN_REPAIR
    assert (
        client_jobs_response.json()[0]["latest_update"]
        == "Repairer started active work on the chair frame and joint reinforcement."
    )

    blocked_payment = customer_client.post(f"/api/bookings/{booking.id}/pay/", format="json")

    assert blocked_payment.status_code == 400
    assert blocked_payment.json()["detail"] == "Payment is unlocked only after the repairer marks the item completed."

    transition_response = repairer_client.post(
        f"/api/jobs/{job.id}/transition/",
        {
            "status": RepairRequest.Status.READY,
            "latest_update": "Joint repair is finished and the chair is ready for customer payment.",
        },
        format="json",
    )

    assert transition_response.status_code == 200
    repair_request.refresh_from_db()
    assert repair_request.status == RepairRequest.Status.READY

    payment_response = customer_client.post(f"/api/bookings/{booking.id}/pay/", format="json")

    assert payment_response.status_code == 200
    booking.refresh_from_db()
    assert booking.payment_status == Booking.PaymentStatus.PAID

    client_jobs_response = customer_client.get("/api/jobs/client-jobs/")
    assert client_jobs_response.status_code == 200
    assert client_jobs_response.json()[0]["status"] == RepairRequest.Status.COMPLETED


@pytest.mark.django_db
def test_repairer_can_reject_selected_request_with_reason():
    customer = User.objects.create_user(username="customer-reject", email="customer-reject@example.com", password="password123", role="customer", profile_status="active")
    repairer_user = User.objects.create_user(username="repairer-reject", email="repairer-reject@example.com", password="password123", role="repairer", profile_status="active")
    category = ServiceCategory.objects.create(name="Bikes", slug="bikes")
    profile = RepairerProfile.objects.create(
        user=repairer_user,
        headline="Bike repair specialist",
        city="Sydney",
        service_radius_km=Decimal("18.0"),
        rating=Decimal("4.90"),
        is_online=True,
        verification_status="verified",
    )
    service = RepairerService.objects.create(
        repairer=profile,
        category=category,
        title="Brake and wheel service",
        description="Brake repair and wheel truing",
        min_price=Decimal("55.00"),
        max_price=Decimal("95.00"),
        warranty_days=7,
        turnaround_hours=8,
    )
    PricingRule.objects.create(service=service, damage_band="general", urgency="standard", multiplier=Decimal("1.00"), flat_fee=Decimal("5.00"))
    repair_request = RepairRequest.objects.create(
        customer=customer,
        category=category,
        item_name="Road Bike",
        issue_description="Rear wheel is bent and the brake rubs heavily.",
        status="matching",
    )
    match = build_matches(repair_request)[0]

    customer_client = APIClient()
    customer_client.force_authenticate(user=customer)
    customer_client.post(
        f"/api/repair-requests/{repair_request.id}/select-match/",
        {
            "match_id": str(match.id),
            "customer_reason": "I need the wheel checked because I use this bike to commute daily.",
        },
        format="json",
    )

    repairer_client = APIClient()
    repairer_client.force_authenticate(user=repairer_user)
    rejection_response = repairer_client.post(
        f"/api/repair-requests/{repair_request.id}/review-selection/",
        {
            "decision": "rejected",
            "repairer_reason": "The damage needs a frame bench that I do not have in this workshop.",
        },
        format="json",
    )

    assert rejection_response.status_code == 200
    repair_request.refresh_from_db()
    assert repair_request.selection_status == RepairRequest.SelectionStatus.REJECTED
    assert repair_request.repairer_response_reason == "The damage needs a frame bench that I do not have in this workshop."

    blocked_booking = customer_client.post(
        "/api/bookings/",
        {
            "repair_request": str(repair_request.id),
            "repairer": str(profile.id),
            "notes": "",
        },
        format="json",
    )

    assert blocked_booking.status_code == 400
    assert blocked_booking.json()["repair_request"][0] == "Repairer approval is required before payment."


@pytest.mark.django_db
def test_start_active_work_backfills_missing_booking_and_job_for_approved_item():
    customer = User.objects.create_user(
        username="customer-start-work",
        email="customer-start-work@example.com",
        password="password123",
        role="customer",
        profile_status="active",
    )
    repairer_user = User.objects.create_user(
        username="repairer-start-work",
        email="repairer-start-work@example.com",
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
        is_online=True,
        verification_status="verified",
    )
    repair_request = RepairRequest.objects.create(
        customer=customer,
        category=category,
        item_name="Samsung Galaxy S24",
        issue_description="Screen is cracked and the touch response is inconsistent.",
        status=RepairRequest.Status.BOOKED,
        selected_repairer=profile,
        selection_status=RepairRequest.SelectionStatus.APPROVED,
        customer_selection_reason="I need the screen fixed before the damage spreads further.",
        repairer_response_reason="I have time so I can fix it.",
        selected_quote_amount=Decimal("105.00"),
    )

    repairer_client = APIClient()
    repairer_client.force_authenticate(user=repairer_user)

    response = repairer_client.post(f"/api/repair-requests/{repair_request.id}/start-active-work/", format="json")

    assert response.status_code == 200
    booking = Booking.objects.get(repair_request=repair_request)
    job = RepairJob.objects.get(booking=booking)
    assert booking.payment_status == Booking.PaymentStatus.PENDING
    assert job.status == RepairRequest.Status.IN_REPAIR
    repair_request.refresh_from_db()
    assert repair_request.status == RepairRequest.Status.IN_REPAIR


@pytest.mark.django_db
def test_analyze_endpoint_rejects_mismatched_request_details(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    customer = User.objects.create_user(
        username="customer-mismatch",
        email="customer-mismatch@example.com",
        password="password123",
        role="customer",
        profile_status="active",
    )
    client = APIClient()
    client.force_authenticate(user=customer)
    repair_request = RepairRequest.objects.create(
        customer=customer,
        category=ServiceCategory.objects.create(name="Electronics", slug="electronics"),
        item_name="Dining Chair",
        issue_description="The chair leg is loose and the wooden frame keeps wobbling.",
        status=RepairRequest.Status.SUBMITTED,
    )

    response = client.post(f"/api/repair-requests/{repair_request.id}/analyze/", format="json")

    assert response.status_code == 400
    assert "These details should be related to each other" in response.json()["detail"]
    repair_request.refresh_from_db()
    assert repair_request.status == RepairRequest.Status.SUBMITTED


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
def test_only_admin_can_manage_repairer_shop_details():
    repairer_user = User.objects.create_user(
        username="repairer-profile",
        email="repairer-profile@example.com",
        password="password123",
        role="repairer",
        profile_status="active",
    )
    repairer_client = APIClient()
    repairer_client.force_authenticate(user=repairer_user)

    forbidden_response = repairer_client.post(
        "/api/repairer-profiles/me/",
        {},
        format="json",
    )

    assert forbidden_response.status_code == 403

    admin_user = User.objects.create_user(
        username="admin-profile",
        email="admin-profile@example.com",
        password="password123",
        role="admin",
        profile_status="active",
    )
    admin_client = APIClient()
    admin_client.force_authenticate(user=admin_user)
    category = ServiceCategory.objects.create(name="Electronics", slug="electronics")

    accounts_response = admin_client.get("/api/repairer-profiles/admin/repairer-accounts/")

    assert accounts_response.status_code == 200
    assert accounts_response.json()[0]["username"] == "repairer-profile"
    assert accounts_response.json()[0]["repairer_profile"] is None
    assert accounts_response.json()[0]["primary_category_id"] is None

    saved_response = admin_client.post(
        "/api/repairer-profiles/admin/upsert-profile/",
        {
            "user_id": str(repairer_user.id),
            "category_id": str(category.id),
            "headline": "Electronics bench",
            "bio": "Board-level diagnostics and common device repairs.",
            "city": "Sydney",
            "shop_name": "Harbour Device Care",
            "shop_address": "100 Pitt Street, Sydney NSW 2000",
            "shop_phone": "+61 2 9000 1234",
            "shop_opening_hours": "Mon-Fri, 9:00 am - 6:00 pm",
            "service_radius_km": "12.0",
        },
        format="json",
    )

    assert saved_response.status_code == 201
    assert saved_response.json()["is_online"] is True
    assert saved_response.json()["shop_name"] == "Harbour Device Care"
    assert saved_response.json()["verification_status"] == "verified"

    accounts_response = admin_client.get("/api/repairer-profiles/admin/repairer-accounts/")
    assert accounts_response.status_code == 200
    assert accounts_response.json()[0]["primary_category_name"] == "Electronics"

    customer = User.objects.create_user(
        username="customer-category",
        email="customer-category@example.com",
        password="password123",
        role="customer",
        profile_status="active",
    )
    repair_request = RepairRequest.objects.create(
        customer=customer,
        category=category,
        item_name="Tablet",
        issue_description="Screen has a dead zone after impact.",
        status="matching",
    )

    matches = build_matches(repair_request)

    assert len(matches) == 1
    assert matches[0].repairer.user_id == repairer_user.id


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
