from __future__ import annotations

import base64
import json
import os
from typing import Any

import httpx

from apps.ai.models import AIAudit

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


def build_fallback_response(summary: str) -> dict[str, Any]:
    return {
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


def normalize_json_payload(text: str) -> dict[str, Any]:
    normalized = text.strip()
    if normalized.startswith("```"):
        normalized = normalized.strip("`")
        if normalized.startswith("json"):
            normalized = normalized[4:]
        normalized = normalized.strip()
    payload = json.loads(normalized)
    return {
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


def build_parts(item_name: str, issue_description: str, photo_urls: list[str]) -> list[dict[str, Any]]:
    prompt = (
        "You are a repair triage assistant. "
        "Analyze the repair request and return strict JSON only with keys: "
        "damage_type, severity, confidence, summary, replace_cost, "
        "waste_saved_kg, estimated_min_cost, estimated_max_cost, estimated_hours. "
        "Base the answer on the item description and any attached images. "
        "Confidence must be a number from 0 to 1. "
        "estimated_hours must be an integer. "
        "Do not wrap the JSON in markdown."
    )
    parts: list[dict[str, Any]] = [
        {
            "text": (
                f"{prompt}\n\n"
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


def analyze_damage(*, item_name: str, issue_description: str, photo_urls: list[str]) -> dict[str, Any]:
    request_payload = {
        "item_name": item_name,
        "issue_description": issue_description,
        "photo_urls": photo_urls,
    }
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        response_payload = build_fallback_response("Fallback estimate generated because Gemini is not configured.")
        AIAudit.objects.create(
            provider=GEMINI_MODEL,
            status="fallback",
            request_payload=request_payload,
            response_payload=response_payload,
            fallback_used=True,
        )
        return response_payload

    request_body = {
        "contents": [
            {
                "role": "user",
                "parts": build_parts(item_name, issue_description, photo_urls),
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
        response_payload = build_fallback_response(
            "Fallback estimate generated because Gemini analysis failed.",
        )
        AIAudit.objects.create(
            provider=GEMINI_MODEL,
            status="fallback",
            request_payload=request_payload,
            response_payload=response_payload,
            fallback_used=True,
        )
        return response_payload

    AIAudit.objects.create(
        provider=GEMINI_MODEL,
        status="completed",
        request_payload=request_payload,
        response_payload=response_payload,
        fallback_used=False,
    )
    return response_payload
