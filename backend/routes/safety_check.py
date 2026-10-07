# backend/routes/safety_check.py — public, no-login battery safety checker.
#
# Anyone (power bank, e-bike, laptop battery owner) can upload a photo and get a
# plain-language safety verdict. Reuses the same Groq vision call as /inspect, just
# mapped to a simpler output — no QC severity enum, no DB row, no account needed.
import time
from collections import defaultdict, deque

from flask import Blueprint, request, jsonify

from ai import analyze_image, AIUnavailable
from severity_policy import decide_disposition

bp = Blueprint("safety_check", __name__)

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB

# In-memory per-IP rate limit — resets on restart and doesn't share state across
# multiple worker processes. Fine for a prototype; swap for Redis before real traffic.
RATE_LIMIT = 10
RATE_WINDOW_SECONDS = 60 * 60
_requests_by_ip = defaultdict(deque)


def _rate_limited(ip: str) -> bool:
    now = time.time()
    window = _requests_by_ip[ip]
    while window and now - window[0] > RATE_WINDOW_SECONDS:
        window.popleft()
    if len(window) >= RATE_LIMIT:
        return True
    window.append(now)
    return False


def _to_verdict(result: dict) -> dict:
    if result.get("is_battery") is not True:
        return {
            "verdict": "NOT_A_BATTERY",
            "headline": "This doesn't look like a battery",
            "advice": "Try a clearer, closer photo of just the battery/cell/pack.",
            "color": "gray",
        }

    # Public safety check has no lot/spec context. Keep policy evaluation
    # local and deterministic; this endpoint must not call the agent/tools.
    policy = decide_disposition(
        result.get("defects", []),
        result.get("image_quality", "ok"),
        {},
    )
    disposition = policy["disposition"]

    if disposition == "QUARANTINE":
        return {
            "verdict": "STOP_USING",
            "disposition": disposition,
            "headline": "Stop using this battery immediately",
            "advice": "Signs of swelling, leakage, burning, or cracking are fire/safety risks. "
                      "Isolate it away from flammable material and take it to a battery recycling point.",
            "color": "red",
        }
    if disposition == "HOLD":
        return {
            "verdict": "GET_IT_CHECKED",
            "disposition": disposition,
            "headline": "Get this battery checked soon",
            "advice": "Damage was found that can worsen over time. Stop regular use until a professional "
                      "inspects it, and avoid charging it unattended.",
            "color": "orange",
        }
    if disposition == "MONITOR":
        return {
            "verdict": "MONITOR",
            "disposition": disposition,
            "headline": "Minor wear found — keep an eye on it",
            "advice": "Not an immediate danger, but check it periodically for swelling or new damage.",
            "color": "yellow",
        }
    return {
        "verdict": "LOOKS_FINE",
        "disposition": disposition,
        "headline": "No visible damage found",
        "advice": "No defects detected in this photo. This isn't a guarantee of internal health — "
                   "still retire any battery that feels hot, swells, or ages past its rated cycle life.",
        "color": "green",
    }


@bp.post("/safety-check")
def safety_check():
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
    if _rate_limited(ip):
        return jsonify({"error": "Too many checks from this address — try again in a bit."}), 429

    file = request.files.get("file")
    if file is None:
        return jsonify({"error": "No file uploaded"}), 400
    if file.mimetype not in ALLOWED_MIME:
        return jsonify({"error": "Only JPG, PNG, or WebP are supported"}), 400

    image = file.read()
    if len(image) > MAX_BYTES:
        return jsonify({"error": "File is larger than 5MB"}), 413

    try:
        result = analyze_image(image, file.mimetype)
    except AIUnavailable as e:
        return jsonify({"error": str(e)}), 503

    verdict = _to_verdict(result)
    return jsonify({
        **verdict,
        "defects": result.get("defects", []),
        "image_quality": result.get("image_quality", "ok"),
    })
