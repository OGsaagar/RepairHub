from __future__ import annotations

import base64
import json
import os
from typing import Any

import httpx
from django.utils.text import slugify

from apps.ai.models import AIAudit

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
CATEGORY_KEYWORDS = {
    "electronics": (
        "iphone",
        "ipad",
        "macbook",
        "samsung",
        "galaxy",
        "pixel",
        "laptop",
        "tablet",
        "phone",
        "screen",
        "battery",
        "charging",
        "speaker",
        "headphone",
        "console",
        "monitor",
        "tv",
        "camera",
    ),
    "furniture": (
        "chair",
        "table",
        "desk",
        "sofa",
        "couch",
        "cabinet",
        "drawer",
        "stool",
        "wood",
        "timber",
        "leg",
        "hinge",
        "seat",
        "frame",
    ),
    "clothing": (
        "jacket",
        "shirt",
        "dress",
        "jeans",
        "pants",
        "trouser",
        "skirt",
        "zip",
        "zipper",
        "seam",
        "fabric",
        "lining",
        "hem",
        "sleeve",
        "coat",
    ),
    "bikes": (
        "bike",
        "bicycle",
        "cycle",
        "brake",
        "chain",
        "pedal",
        "wheel",
        "tyre",
        "tire",
        "handlebar",
        "saddle",
        "gear",
        "drivetrain",
        "rim",
    ),
}
CATEGORY_LABELS = {
    "electronics": "Electronics",
    "furniture": "Furniture",
    "clothing": "Clothing",
    "bikes": "Bikes",
}
DEFAULT_CONSISTENCY_MESSAGE = (
    "These details should be related to each other. Please make sure the repair category, item/model, "
    "problem description, and uploaded photo all refer to the same repair item."
)


def build_fallback_response(summary: str) -> dict[str, Any]:
    return {
        "is_consistent": True,
        "consistency_message": "",
        "detected_category": "",
        "damage_type": "Cracked screen + LCD damage",
        "severity": "Moderate",
        "confidence": 0.71,
        "summary": summary,
        "replace_cost": 850,
        "waste_saved_kg": 14,
        "estimated_min_cost": 80,
        "estimated_max_cost": 130,
        "estimated_hours": 2,
    }


def build_inconsistency_response(message: str, *, detected_category: str = "") -> dict[str, Any]:
    return {
        "is_consistent": False,
        "consistency_message": message,
        "detected_category": detected_category,
        "damage_type": "Mismatch detected",
        "severity": "Needs review",
        "confidence": 0.0,
        "summary": message,
        "replace_cost": 0,
        "waste_saved_kg": 0,
        "estimated_min_cost": 0,
        "estimated_max_cost": 0,
        "estimated_hours": 0,
    }


def to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes"}
    return bool(value)


def normalize_json_payload(text: str) -> dict[str, Any]:
    normalized = text.strip()
    if normalized.startswith("```"):
        normalized = normalized.strip("`")
        if normalized.startswith("json"):
            normalized = normalized[4:]
        normalized = normalized.strip()
    payload = json.loads(normalized)
    return {
        "is_consistent": to_bool(payload.get("is_consistent", True)),
        "consistency_message": str(payload.get("consistency_message", "")),
        "detected_category": str(payload.get("detected_category", "")),
        "damage_type": str(payload.get("damage_type", "Damage assessment unavailable")),
        "severity": str(payload.get("severity", "Moderate")),
        "confidence": float(payload.get("confidence", 0.7)),
        "summary": str(payload.get("summary", "Gemini returned an incomplete response.")),
        "replace_cost": float(payload.get("replace_cost", 850)),
        "waste_saved_kg": float(payload.get("waste_saved_kg", 12)),
        "estimated_min_cost": float(payload.get("estimated_min_cost", 90)),
        "estimated_max_cost": float(payload.get("estimated_max_cost", 140)),
        "estimated_hours": int(payload.get("estimated_hours", 2)),
    }


def normalize_category_name(category_name: str | None) -> str:
    return slugify(category_name or "")


def infer_category_from_text(text: str) -> tuple[str | None, int]:
    normalized = text.lower()
    scores = {
        category_slug: sum(1 for keyword in keywords if keyword in normalized)
        for category_slug, keywords in CATEGORY_KEYWORDS.items()
    }
    best_category, best_score = max(scores.items(), key=lambda item: item[1])
    if best_score == 0:
        return None, 0
    if sum(1 for score in scores.values() if score == best_score) > 1:
        return None, best_score
    return best_category, best_score


def validate_text_consistency(*, category_name: str | None, item_name: str, issue_description: str) -> dict[str, Any]:
    selected_category = normalize_category_name(category_name)
    item_category, item_score = infer_category_from_text(item_name)
    description_category, description_score = infer_category_from_text(issue_description)
    combined_category, combined_score = infer_category_from_text(f"{item_name} {issue_description}")

    if item_category and description_category and item_category != description_category:
        return build_inconsistency_response(
            "These details should be related to each other. The item/model and the problem description appear to describe different types of repair.",
            detected_category=combined_category or "",
        )

    if selected_category:
        if item_category and item_category != selected_category:
            return build_inconsistency_response(
                f"These details should be related to each other. The selected category is {CATEGORY_LABELS.get(selected_category, category_name or selected_category)}, "
                f"but the item/model looks more like {CATEGORY_LABELS.get(item_category, item_category)}.",
                detected_category=item_category,
            )
        if description_category and description_category != selected_category:
            return build_inconsistency_response(
                f"These details should be related to each other. The problem description looks more like {CATEGORY_LABELS.get(description_category, description_category)} "
                f"than {CATEGORY_LABELS.get(selected_category, category_name or selected_category)}.",
                detected_category=description_category,
            )
        if combined_category and combined_category != selected_category and combined_score > max(item_score, description_score):
            return build_inconsistency_response(
                f"These details should be related to each other. The overall request looks more like {CATEGORY_LABELS.get(combined_category, combined_category)} "
                f"than {CATEGORY_LABELS.get(selected_category, category_name or selected_category)}.",
                detected_category=combined_category,
            )

    return {
        "is_consistent": True,
        "consistency_message": "",
        "detected_category": combined_category or "",
    }


def build_parts(category_name: str | None, item_name: str, issue_description: str, photo_urls: list[str]) -> list[dict[str, Any]]:
    prompt = (
        "You are a repair triage assistant. "
        "First check whether the selected repair category, item/model, written problem, and attached images all describe the same repair item. "
        "Return strict JSON only with keys: "
        "is_consistent, consistency_message, detected_category, damage_type, severity, confidence, summary, replace_cost, "
        "waste_saved_kg, estimated_min_cost, estimated_max_cost, estimated_hours. "
        "detected_category must be one of electronics, furniture, clothing, bikes, or unknown. "
        "If any major mismatch exists, set is_consistent to false, explain the conflict in consistency_message, set summary to the same explanation, "
        "and set damage_type to 'Mismatch detected' with all cost/time values set to 0. "
        "If the request is consistent, set is_consistent to true and keep consistency_message empty. "
        "Base the answer on the selected category, the written details, and any attached images. "
        "If no images are attached, judge consistency from the text only. "
        "Confidence must be a number from 0 to 1. "
        "estimated_hours must be an integer. "
        "Do not wrap the JSON in markdown."
    )
    parts: list[dict[str, Any]] = [
        {
            "text": (
                f"{prompt}\n\n"
                f"Selected repair category: {category_name or 'Not provided'}\n"
                f"Item: {item_name}\n"
                f"Issue description: {issue_description}\n"
                f"Attached photo count: {len(photo_urls)}"
            )
        }
    ]

    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
        for photo_url in photo_urls[:3]:
            try:
                response = client.get(photo_url)
                response.raise_for_status()
                content_type = response.headers.get("content-type", "image/jpeg").split(";")[0]
                parts.append(
                    {
                        "inline_data": {
                            "mime_type": content_type,
                            "data": base64.b64encode(response.content).decode("utf-8"),
                        }
                    }
                )
            except Exception:
                parts.append({"text": f"Photo URL (not fetched): {photo_url}"})

    return parts


def create_ai_audit(*, request_payload: dict[str, Any], response_payload: dict[str, Any], status: str, fallback_used: bool) -> None:
    AIAudit.objects.create(
        provider=GEMINI_MODEL,
        status=status,
        request_payload=request_payload,
        response_payload=response_payload,
        fallback_used=fallback_used,
    )


def analyze_damage(
    *,
    category_name: str | None = None,
    item_name: str,
    issue_description: str,
    photo_urls: list[str],
) -> dict[str, Any]:
    request_payload = {
        "category_name": category_name,
        "item_name": item_name,
        "issue_description": issue_description,
        "photo_urls": photo_urls,
    }
    text_consistency = validate_text_consistency(
        category_name=category_name,
        item_name=item_name,
        issue_description=issue_description,
    )
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        if not text_consistency["is_consistent"]:
            response_payload = build_inconsistency_response(
                text_consistency["consistency_message"] or DEFAULT_CONSISTENCY_MESSAGE,
                detected_category=text_consistency["detected_category"],
            )
            create_ai_audit(
                request_payload=request_payload,
                response_payload=response_payload,
                status="rejected",
                fallback_used=True,
            )
            return response_payload
        response_payload = build_fallback_response("Fallback estimate generated because Gemini is not configured.")
        create_ai_audit(
            request_payload=request_payload,
            response_payload=response_payload,
            status="fallback",
            fallback_used=True,
        )
        return response_payload

    request_body = {
        "contents": [
            {
                "role": "user",
                "parts": build_parts(category_name, item_name, issue_description, photo_urls),
            }
        ]
    }

    try:
        response = httpx.post(
            GEMINI_ENDPOINT,
            headers={
                "x-goog-api-key": api_key,
                "Content-Type": "application/json",
            },
            json=request_body,
            timeout=40.0,
        )
        response.raise_for_status()
        payload = response.json()
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
        response_payload = normalize_json_payload(text)
    except Exception:
        if not text_consistency["is_consistent"]:
            response_payload = build_inconsistency_response(
                text_consistency["consistency_message"] or DEFAULT_CONSISTENCY_MESSAGE,
                detected_category=text_consistency["detected_category"],
            )
            create_ai_audit(
                request_payload=request_payload,
                response_payload=response_payload,
                status="rejected",
                fallback_used=True,
            )
            return response_payload
        response_payload = build_fallback_response(
            "Fallback estimate generated because Gemini analysis failed.",
        )
        create_ai_audit(
            request_payload=request_payload,
            response_payload=response_payload,
            status="fallback",
            fallback_used=True,
        )
        return response_payload

    if not response_payload["is_consistent"]:
        if not response_payload["consistency_message"]:
            response_payload["consistency_message"] = DEFAULT_CONSISTENCY_MESSAGE
            response_payload["summary"] = response_payload["consistency_message"]
        create_ai_audit(
            request_payload=request_payload,
            response_payload=response_payload,
            status="rejected",
            fallback_used=False,
        )
        return response_payload

    create_ai_audit(
        request_payload=request_payload,
        response_payload=response_payload,
        status="completed",
        fallback_used=False,
    )
    return response_payload
