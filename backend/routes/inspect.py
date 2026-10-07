# backend/routes/inspect.py — อัปโหลดรูป ให้ AI (vision) ตรวจตำหนิ
import os
import uuid

from flask import Blueprint, request, jsonify, g

from db import execute, execute_many, query
from auth import token_required
from ai import analyze_image, AIUnavailable
from label_chemistry import identify_chemistry
from severity_policy import SEVERITY_ORDER, decide_disposition, defect_severity

bp = Blueprint("inspect", __name__)

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MIME_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB
CAPTURE_ROLES = ("top", "terminal_side", "label_closeup")
QUALITY_PRIORITY = {
    "ok": 0,
    "blurry": 1,
    "too_dark": 1,
    "too_bright": 1,
    "obstructed": 1,
    "wrong_framing": 1,
}

UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


def _save_image(image: bytes, mime: str, user_id: int) -> str:
    """Saves to disk, returns a path relative to UPLOAD_ROOT (what we store in the DB)."""
    user_dir = os.path.join(UPLOAD_ROOT, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    rel_path = os.path.join(str(user_id), f"{uuid.uuid4().hex}{MIME_EXT[mime]}")
    with open(os.path.join(UPLOAD_ROOT, rel_path), "wb") as f:
        f.write(image)
    return rel_path.replace("\\", "/")


@bp.post("/inspect")
@token_required
def inspect_image():
    lot_id = request.form.get("lot_id", "").strip() or None
    if lot_id and len(lot_id) > 50:
        return jsonify({"error": "lot_id must be 50 characters or fewer"}), 400
    if lot_id and query(
        "SELECT lot_id FROM lots WHERE lot_id = %s LIMIT 1",
        (lot_id,),
        one=True,
    ) is None:
        return jsonify({"error": "Unknown lot_id"}), 404

    captures = {}
    total_bytes = 0
    for role in CAPTURE_ROLES:
        file = request.files.get(role)
        if file is None:
            return jsonify({"error": f"Missing required photo: {role}"}), 400
        if file.mimetype not in ALLOWED_MIME:
            return jsonify({"error": f"Unsupported image type for {role}; use JPG, PNG, or WebP"}), 400
        image = file.read()
        if not image:
            return jsonify({"error": f"Photo is empty: {role}"}), 400
        if len(image) > MAX_BYTES:
            return jsonify({"error": f"Photo {role} is larger than 5MB"}), 413
        total_bytes += len(image)
        captures[role] = {"file": file, "image": image}
    if total_bytes > len(CAPTURE_ROLES) * MAX_BYTES:
        return jsonify({"error": "Combined photos are larger than 15MB"}), 413

    image_paths = {
        role: _save_image(capture["image"], capture["file"].mimetype, g.user_id)
        for role, capture in captures.items()
    }

    upload_id, _ = execute(
        "INSERT INTO inspections (filename, user_id, lot_id, analysis_status, image_path) "
        "VALUES (%s, %s, %s, 'PENDING', %s)",
        (captures["top"]["file"].filename, g.user_id, lot_id, image_paths["top"]),
    )
    execute_many([
        (
            "INSERT INTO inspection_images (inspection_id, role, image_path) "
            "VALUES (%s, %s, %s)",
            (upload_id, role, image_paths[role]),
        )
        for role in CAPTURE_ROLES
    ])

    try:
        per_photo = {
            role: analyze_image(
                captures[role]["image"],
                captures[role]["file"].mimetype,
                user_id=g.user_id,
            )
            for role in CAPTURE_ROLES
        }
    except AIUnavailable as e:
        execute(
            "UPDATE inspections SET analysis_status = 'FAILED', error_message = %s "
            "WHERE id = %s AND user_id = %s",
            (str(e), upload_id, g.user_id),
        )
        return jsonify({"error": str(e)}), 503

    battery_photos = {
        role: result for role, result in per_photo.items()
        if result.get("is_battery") is True
    }
    if not battery_photos:
        execute(
            "UPDATE inspections SET is_battery = FALSE, analysis_status = 'REJECTED', "
            "error_message = %s WHERE id = %s AND user_id = %s",
            ("Not a battery, upload again", upload_id, g.user_id),
        )
        return jsonify({"error": "Not a battery, upload again"}), 400

    defects_by_key = {}
    for role, photo_result in battery_photos.items():
        for defect in photo_result["defects"]:
            location = f"{role}: {defect['location']}"[:100]
            key = (defect["type"], location)
            existing = defects_by_key.get(key)
            if existing is None or defect["visible_confidence"] > existing["visible_confidence"]:
                defects_by_key[key] = {
                    "type": defect["type"],
                    "location": location,
                    "visible_confidence": defect["visible_confidence"],
                }
    defects = list(defects_by_key.values())

    label_text = battery_photos.get("label_closeup", {}).get("label_text", "")
    if not label_text:
        label_text = max(
            (photo_result.get("label_text", "") for photo_result in battery_photos.values()),
            key=len,
            default="",
        )
    chemistry = identify_chemistry(label_text)

    image_quality = min(
        (photo_result["image_quality"] for photo_result in battery_photos.values()),
        key=lambda quality: QUALITY_PRIORITY.get(quality, 1),
    )

    # Policy decision happens here, in Python, from the model's raw
    # observations — see severity_policy.py for why that split exists.
    policy = decide_disposition(defects, image_quality, chemistry)

    has_defect = bool(defects)
    # DB still has one defect_type column; store the most severe observed
    # type there, and keep the full merged list in the response.
    top_defect = max(
        defects,
        key=lambda defect: SEVERITY_ORDER.index(defect_severity(defect["type"])),
    )["type"] if defects else "ไม่พบ"
    top_confidence = max((d["visible_confidence"] for d in defects), default=1.0)
    description = "; ".join(f"{d['type']} ({d['location']})" for d in defects) or "No defects observed"

    execute(
        "UPDATE inspections SET is_battery = TRUE, has_defect = %s, defect_type = %s, "
        "severity = %s, disposition = %s, description = %s, confidence = %s, "
        "analysis_status = 'COMPLETED', label_text = %s, detected_chemistry = %s, "
        "is_high_value = %s WHERE id = %s AND user_id = %s",
        (has_defect, top_defect, policy["severity"], policy["disposition"], description,
         top_confidence, label_text, chemistry["detected_chemistry"],
         chemistry["is_high_value"], upload_id, g.user_id),
    )
    return jsonify({
        "id": upload_id,
        "is_battery": True,
        "defects": defects,
        "image_quality": image_quality,
        "images": [{"role": role} for role in CAPTURE_ROLES],
        "severity": policy["severity"],
        "disposition": policy["disposition"],
        "reasons": policy["reasons"],
        "description": description,
        "confidence": top_confidence,
        "label_text": label_text,
        "lot_id": lot_id,
        **chemistry,
    }), 201