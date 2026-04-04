from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from math import asin, cos, radians, sin, sqrt

from django.conf import settings
from django.contrib.auth import get_user_model

from apps.catalog.models import PricingRule, RepairerService
from apps.repairers.models import RepairerProfile
from apps.repairs.models import RepairAnalysis, RepairJob, RepairMatch, RepairRequest

User = get_user_model()
TWO_PLACES = Decimal("0.01")


DEMO_MARKETPLACE = {
    "electronics": [
        {
            "email": "marcus.rivera.demo@repairhub.app",
            "first_name": "Marcus",
            "last_name": "Rivera",
            "headline": "Phone and tablet specialist",
            "city": "Sydney CBD",
            "shop_name": "Circular Devices Sydney",
            "shop_address": "22 George Street, Sydney NSW 2000",
            "shop_phone": "+61 2 9000 1101",
            "shop_opening_hours": "Mon-Sat, 9:00 am - 6:00 pm",
            "latitude": Decimal("-33.868800"),
            "longitude": Decimal("151.209300"),
            "rating": Decimal("4.90"),
            "reviews_count": 127,
            "service_title": "Screen and battery repair",
            "service_description": "OLED, LCD, charging, and diagnostics support for phones and tablets.",
            "min_price": Decimal("80.00"),
            "max_price": Decimal("120.00"),
            "warranty_days": 7,
            "turnaround_hours": 4,
        },
        {
            "email": "priya.tanaka.demo@repairhub.app",
            "first_name": "Priya",
            "last_name": "Tanaka",
            "headline": "Samsung and battery diagnostics",
            "city": "Parramatta",
            "shop_name": "Western Repair Lab",
            "shop_address": "58 Church Street, Parramatta NSW 2150",
            "shop_phone": "+61 2 9000 2202",
            "shop_opening_hours": "Mon-Fri, 10:00 am - 7:00 pm",
            "latitude": Decimal("-33.815000"),
            "longitude": Decimal("151.001100"),
            "rating": Decimal("4.70"),
            "reviews_count": 82,
            "service_title": "Battery and charging repair",
            "service_description": "Power, battery health, and charging diagnostics for modern devices.",
            "min_price": Decimal("90.00"),
            "max_price": Decimal("130.00"),
            "warranty_days": 30,
            "turnaround_hours": 6,
        },
        {
            "email": "aiden.kim.demo@repairhub.app",
            "first_name": "Aiden",
            "last_name": "Kim",
            "headline": "Express diagnostics and tablet repair",
            "city": "Chatswood",
            "shop_name": "North Shore Fix Studio",
            "shop_address": "11 Anderson Street, Chatswood NSW 2067",
            "shop_phone": "+61 2 9000 3303",
            "shop_opening_hours": "Daily, 9:30 am - 5:30 pm",
            "latitude": Decimal("-33.796900"),
            "longitude": Decimal("151.183200"),
            "rating": Decimal("4.80"),
            "reviews_count": 103,
            "service_title": "Express device diagnostics",
            "service_description": "Rapid fault detection and repair triage for phones, tablets, and accessories.",
            "min_price": Decimal("88.00"),
            "max_price": Decimal("118.00"),
            "warranty_days": 14,
            "turnaround_hours": 3,
        },
    ],
    "furniture": [
        {
            "email": "lina.ortega.demo@repairhub.app",
            "first_name": "Lina",
            "last_name": "Ortega",
            "headline": "Wood restoration and joinery",
            "city": "Newtown",
            "shop_name": "Newtown Timber Restore",
            "shop_address": "103 King Street, Newtown NSW 2042",
            "shop_phone": "+61 2 9000 4404",
            "shop_opening_hours": "Tue-Sat, 8:30 am - 5:00 pm",
            "latitude": Decimal("-33.898100"),
            "longitude": Decimal("151.174900"),
            "rating": Decimal("4.80"),
            "reviews_count": 56,
            "service_title": "Chair and table restoration",
            "service_description": "Joint repair, refinishing, and structural reinforcement for home furniture.",
            "min_price": Decimal("60.00"),
            "max_price": Decimal("180.00"),
            "warranty_days": 14,
            "turnaround_hours": 24,
        },
        {
            "email": "devon.reed.demo@repairhub.app",
            "first_name": "Devon",
            "last_name": "Reed",
            "headline": "Home furniture repairs",
            "city": "Penrith",
            "shop_name": "Blue Mountains Home Repairs",
            "shop_address": "40 High Street, Penrith NSW 2750",
            "shop_phone": "+61 2 9000 5505",
            "shop_opening_hours": "Mon-Sat, 8:00 am - 4:30 pm",
            "latitude": Decimal("-33.750600"),
            "longitude": Decimal("150.694200"),
            "rating": Decimal("4.60"),
            "reviews_count": 34,
            "service_title": "Cabinet and frame repair",
            "service_description": "Frame stabilization, hinge replacement, and structural furniture repairs.",
            "min_price": Decimal("55.00"),
            "max_price": Decimal("160.00"),
            "warranty_days": 10,
            "turnaround_hours": 30,
        },
    ],
    "clothing": [
        {
            "email": "sofia.laurent.demo@repairhub.app",
            "first_name": "Sofia",
            "last_name": "Laurent",
            "headline": "Leather and tailoring repairs",
            "city": "Marrickville",
            "shop_name": "Marrickville Tailor Works",
            "shop_address": "87 Illawarra Road, Marrickville NSW 2204",
            "shop_phone": "+61 2 9000 6606",
            "shop_opening_hours": "Mon-Fri, 9:00 am - 5:30 pm",
            "latitude": Decimal("-33.910800"),
            "longitude": Decimal("151.159100"),
            "rating": Decimal("4.80"),
            "reviews_count": 91,
            "service_title": "Zip, seam, and lining repair",
            "service_description": "Tailoring for jackets, denim, and everyday garments.",
            "min_price": Decimal("30.00"),
            "max_price": Decimal("75.00"),
            "warranty_days": 14,
            "turnaround_hours": 12,
        },
        {
            "email": "amina.yusuf.demo@repairhub.app",
            "first_name": "Amina",
            "last_name": "Yusuf",
            "headline": "Alterations and garment rescue",
            "city": "Surry Hills",
            "shop_name": "Surry Stitch Collective",
            "shop_address": "14 Foveaux Street, Surry Hills NSW 2010",
            "shop_phone": "+61 2 9000 7707",
            "shop_opening_hours": "Tue-Sun, 10:00 am - 6:00 pm",
            "latitude": Decimal("-33.884000"),
            "longitude": Decimal("151.209400"),
            "rating": Decimal("4.70"),
            "reviews_count": 48,
            "service_title": "Alterations and stitching",
            "service_description": "Everyday garment mending, alterations, and denim reinforcement.",
            "min_price": Decimal("25.00"),
            "max_price": Decimal("65.00"),
            "warranty_days": 7,
            "turnaround_hours": 18,
        },
    ],
    "bikes": [
        {
            "email": "noah.bennett.demo@repairhub.app",
            "first_name": "Noah",
            "last_name": "Bennett",
            "headline": "Brake and drivetrain tune-ups",
            "city": "Alexandria",
            "shop_name": "Alexandria Bike Bench",
            "shop_address": "205 Botany Road, Alexandria NSW 2015",
            "shop_phone": "+61 2 9000 8808",
            "shop_opening_hours": "Mon-Sat, 7:30 am - 5:30 pm",
            "latitude": Decimal("-33.910000"),
            "longitude": Decimal("151.194000"),
            "rating": Decimal("4.90"),
            "reviews_count": 72,
            "service_title": "Brake and wheel service",
            "service_description": "Brake alignment, cable replacement, and wheel tuning.",
            "min_price": Decimal("35.00"),
            "max_price": Decimal("95.00"),
            "warranty_days": 7,
            "turnaround_hours": 8,
        },
        {
            "email": "maya.singh.demo@repairhub.app",
            "first_name": "Maya",
            "last_name": "Singh",
            "headline": "Urban bike repair and tuning",
            "city": "Bondi Junction",
            "shop_name": "Bondi Cycle Care",
            "shop_address": "72 Oxford Street, Bondi Junction NSW 2022",
            "shop_phone": "+61 2 9000 9909",
            "shop_opening_hours": "Daily, 8:00 am - 4:00 pm",
            "latitude": Decimal("-33.892700"),
            "longitude": Decimal("151.247500"),
            "rating": Decimal("4.60"),
            "reviews_count": 41,
            "service_title": "General bike tune-up",
            "service_description": "Urban commuter maintenance, brake setup, and drivetrain adjustments.",
            "min_price": Decimal("28.00"),
            "max_price": Decimal("85.00"),
            "warranty_days": 7,
            "turnaround_hours": 10,
        },
    ],
}


def haversine_distance_km(lat1: Decimal, lon1: Decimal, lat2: Decimal, lon2: Decimal) -> Decimal:
    radius = 6371
    lat1_value = Decimal(str(lat1))
    lon1_value = Decimal(str(lon1))
    lat2_value = Decimal(str(lat2))
    lon2_value = Decimal(str(lon2))
    dlat = radians(float(lat2_value - lat1_value))
    dlon = radians(float(lon2_value - lon1_value))
    lat1_rad = radians(float(lat1_value))
    lat2_rad = radians(float(lat2_value))
    area = sin(dlat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2) ** 2
    value = 2 * radius * asin(sqrt(area))
    return Decimal(str(round(value, 2)))


def quantize_decimal(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def estimate_quote(service: RepairerService, request: RepairRequest) -> Decimal:
    base = (service.min_price + service.max_price) / 2
    rule = (
        PricingRule.objects.filter(service=service, urgency=request.urgency)
        .order_by("-created_at")
        .first()
    )
    if not rule:
        return quantize_decimal(base)
    return quantize_decimal((base * rule.multiplier) + rule.flat_fee)


def calculate_match_score(distance: Decimal, rating: Decimal, quote: Decimal) -> Decimal:
    distance_score = max(Decimal("0"), Decimal("100") - distance)
    rating_score = rating * Decimal("10")
    quote_score = max(Decimal("0"), Decimal("20") - (quote / Decimal("10")))
    return quantize_decimal(distance_score + rating_score + quote_score)


def ensure_demo_marketplace_data(repair_request: RepairRequest) -> None:
    if not settings.DEBUG or repair_request.category is None:
        return

    category_slug = repair_request.category.slug
    if category_slug not in DEMO_MARKETPLACE:
        return

    for spec in DEMO_MARKETPLACE[category_slug]:
        user, _ = User.objects.get_or_create(
            email=spec["email"],
            defaults={
                "username": spec["email"],
                "first_name": spec["first_name"],
                "last_name": spec["last_name"],
                "role": User.Role.REPAIRER,
                "profile_status": User.ProfileStatus.ACTIVE,
            },
        )
        if not user.has_usable_password():
            user.set_password("repairhub-demo-123")
            user.save(update_fields=["password"])

        profile, _ = RepairerProfile.objects.update_or_create(
            user=user,
            defaults={
                "headline": spec["headline"],
                "city": spec["city"],
                "shop_name": spec["shop_name"],
                "shop_address": spec["shop_address"],
                "shop_phone": spec["shop_phone"],
                "shop_opening_hours": spec["shop_opening_hours"],
                "service_radius_km": Decimal("18.0"),
                "rating": spec["rating"],
                "reviews_count": spec["reviews_count"],
                "latitude": spec["latitude"],
                "longitude": spec["longitude"],
                "verification_status": RepairerProfile.VerificationStatus.VERIFIED,
                "is_online": True,
            },
        )
        service, _ = RepairerService.objects.update_or_create(
            repairer=profile,
            category=repair_request.category,
            title=spec["service_title"],
            defaults={
                "description": spec["service_description"],
                "min_price": spec["min_price"],
                "max_price": spec["max_price"],
                "warranty_days": spec["warranty_days"],
                "turnaround_hours": spec["turnaround_hours"],
                "is_active": True,
            },
        )
        for urgency, multiplier, flat_fee in [
            (RepairRequest.Urgency.STANDARD, Decimal("1.00"), Decimal("5.00")),
            (RepairRequest.Urgency.URGENT, Decimal("1.18"), Decimal("12.00")),
            (RepairRequest.Urgency.FLEXIBLE, Decimal("0.95"), Decimal("0.00")),
        ]:
            PricingRule.objects.update_or_create(
                service=service,
                damage_band="general",
                urgency=urgency,
                defaults={
                    "multiplier": multiplier,
                    "flat_fee": flat_fee,
                },
            )


def build_matches(repair_request: RepairRequest) -> list[RepairMatch]:
    if repair_request.category is None:
        return []

    ensure_demo_marketplace_data(repair_request)

    services = RepairerService.objects.select_related("repairer").filter(
        category=repair_request.category,
        is_active=True,
        repairer__verification_status="verified",
        repairer__is_online=True,
    )
    RepairMatch.objects.filter(repair_request=repair_request).delete()

    matches_to_create: list[RepairMatch] = []
    for service in services:
        distance = haversine_distance_km(
            repair_request.latitude,
            repair_request.longitude,
            service.repairer.latitude,
            service.repairer.longitude,
        )
        if distance > service.repairer.service_radius_km:
            continue
        quote = estimate_quote(service, repair_request)
        score = calculate_match_score(
            distance=distance,
            rating=service.repairer.rating,
            quote=quote,
        )
        matches_to_create.append(
            RepairMatch(
                repair_request=repair_request,
                repairer=service.repairer,
                service=service,
                distance_km=distance,
                quote_amount=quote,
                eta_hours=service.turnaround_hours,
                score=score,
                ranking_reason="Ranked by distance, rating, and pricing rules",
                selected=bool(
                    repair_request.selected_repairer_id == service.repairer_id
                    and repair_request.selected_service_id == service.id
                ),
            )
        )

    if matches_to_create:
        RepairMatch.objects.bulk_create(matches_to_create)

    matches = list(
        RepairMatch.objects.select_related("repairer__user", "service")
        .filter(repair_request=repair_request)
        .order_by("-score", "distance_km", "quote_amount")
    )
    repair_request.status = RepairRequest.Status.MATCHED if matches else RepairRequest.Status.MATCHING
    repair_request.save(update_fields=["status", "updated_at"])
    return matches


def attach_analysis(repair_request: RepairRequest, analysis_data: dict[str, object]) -> RepairAnalysis:
    analysis, _ = RepairAnalysis.objects.update_or_create(
        repair_request=repair_request,
        defaults={
            "damage_type": str(analysis_data["damage_type"]),
            "severity": str(analysis_data["severity"]),
            "confidence": Decimal(str(analysis_data["confidence"])),
            "summary": str(analysis_data["summary"]),
            "replace_cost": Decimal(str(analysis_data["replace_cost"])),
            "waste_saved_kg": Decimal(str(analysis_data["waste_saved_kg"])),
            "raw_payload": dict(analysis_data),
        },
    )
    repair_request.status = RepairRequest.Status.ANALYZED
    repair_request.estimated_min_cost = Decimal(str(analysis_data["estimated_min_cost"]))
    repair_request.estimated_max_cost = Decimal(str(analysis_data["estimated_max_cost"]))
    repair_request.estimated_hours = int(analysis_data["estimated_hours"])
    repair_request.save(
        update_fields=[
            "status",
            "estimated_min_cost",
            "estimated_max_cost",
            "estimated_hours",
            "updated_at",
        ]
    )
    return analysis


def transition_job(job: RepairJob, new_status: str, latest_update: str) -> RepairJob:
    job.status = new_status
    job.latest_update = latest_update
    job.save(update_fields=["status", "latest_update", "updated_at"])
    return job
