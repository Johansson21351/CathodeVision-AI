# backend/routes/inspect.py — อัปโหลดรูป ให้ AI (vision) ตรวจตำหนิ
import os
import uuid

from flask import Blueprint, request, jsonify, g

from db import execute
from auth import token_required
from ai import analyze_image, AIUnavailable
from label_chemistry import identify_chemistry
from severity_policy import decide_disposition

bp = Blueprint("inspect", __name__)

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MIME_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB

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
    file = request.files.get("file")  # ชื่อต้องตรงกับ FormData ฝั่ง frontend
    if file is None:
        return jsonify({"error": "ไม่พบไฟล์"}), 400
    if file.mimetype not in ALLOWED_MIME:
        return jsonify({"error": "รองรับเฉพาะ JPG/PNG/WebP"}), 400

    image = file.read()
    if len(image) > MAX_BYTES:
        return jsonify({"error": "ไฟล์ใหญ่เกิน 5 MB"}), 413

    image_path = _save_image(image, file.mimetype, g.user_id)

    upload_id, _ = execute(
        "INSERT INTO inspections (filename, user_id, analysis_status, image_path) "
        "VALUES (%s, %s, 'PENDING', %s)",
        (file.filename, g.user_id, image_path),
    )

    try:
        result = analyze_image(image, file.mimetype)
    except AIUnavailable as e:
        execute(
            "UPDATE inspections SET analysis_status = 'FAILED', error_message = %s "
            "WHERE id = %s AND user_id = %s",
            (str(e), upload_id, g.user_id),
        )
        return jsonify({"error": str(e)}), 503

    if result.get("is_battery") is not True:
        execute(
            "UPDATE inspections SET is_battery = FALSE, analysis_status = 'REJECTED', "
            "error_message = %s WHERE id = %s AND user_id = %s",
            ("Not a battery, upload again", upload_id, g.user_id),
        )
        return jsonify({"error": "Not a battery, upload again"}), 400

    label_text = result.get("label_text", "")  # already capped to 500 in ai.py
    chemistry = identify_chemistry(label_text)

    # Policy decision happens here, in Python, from the model's raw
    # observations — see severity_policy.py for why that split exists.
    policy = decide_disposition(result["defects"], result["image_quality"], chemistry)

    has_defect = bool(result["defects"])
    # DB still has one defect_type column; store the most severe observed
    # type for that field, and keep the full list in the JSON response so
    # the frontend can show every defect, not just the worst one.
    top_defect = result["defects"][0]["type"] if result["defects"] else "ไม่พบ"
    top_confidence = max((d["visible_confidence"] for d in result["defects"]), default=1.0)
    description = "; ".join(f"{d['type']} ({d['location']})" for d in result["defects"]) or "No defects observed"

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
        "defects": result["defects"],
        "image_quality": result["image_quality"],
        "severity": policy["severity"],
        "disposition": policy["disposition"],
        "reasons": policy["reasons"],
        "description": description,
        "confidence": top_confidence,
        "label_text": label_text,
        **chemistry,
    }), 201