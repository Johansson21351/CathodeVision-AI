import os

from flask import Blueprint, jsonify, g, request, send_from_directory

from auth import token_required
from db import execute, query
from ai import AIUnavailable, recommend_action
import ai as ai_module
from prompt import DEFECT_TYPES

bp = Blueprint("inspections", __name__)

UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


@bp.get("/inspections/defect-types")
@token_required
def list_defect_types():
    return jsonify(DEFECT_TYPES)


@bp.get("/model-config")
@token_required
def model_config():
    return jsonify({
        "detector_backend": "groq",
        "groq": {
            "vision_model": ai_module.VISION_MODEL,
            "text_model": ai_module.MODEL,
            "active": True,
        },
    })


@bp.get("/inspections")
@token_required
def list_inspections():
    sql = (
        "SELECT i.id, i.filename, i.has_defect, i.defect_type, i.severity, i.description, "
        "i.confidence, i.is_battery, i.analysis_status, i.error_message, "
        "i.label_text, i.detected_chemistry, i.is_high_value, i.image_path, i.created_at, "
        "r.status AS review_status, r.corrected_type, u.username AS reviewed_by "
        "FROM inspections i "
        "LEFT JOIN inspection_reviews r ON r.inspection_id = i.id "
        "LEFT JOIN users u ON u.id = r.reviewer_id "
        "WHERE i.user_id = %s"
    )
    params = [g.user_id]

    keyword = request.args.get("q", "").strip()
    if keyword:
        sql += " AND (i.defect_type LIKE %s OR i.id = %s)"
        params += [f"%{keyword}%", keyword if keyword.isdigit() else -1]

    status = request.args.get("status", "").strip().upper()
    if status == "PENDING":
        sql += " AND r.status IS NULL"
    elif status in {"APPROVED", "REJECTED"}:
        sql += " AND r.status = %s"
        params.append(status)

    sql += " ORDER BY i.created_at DESC LIMIT 100"

    rows = query(sql, tuple(params))
    for row in rows:
        row["has_defect"] = bool(row["has_defect"])
        row["is_battery"] = bool(row["is_battery"])
        row["is_high_value"] = bool(row["is_high_value"])
        row["review_status"] = row["review_status"] or "PENDING"
    return jsonify(rows)


@bp.get("/inspections/<int:inspection_id>/image")
@token_required
def get_inspection_image(inspection_id):
    inspection = query(
        "SELECT image_path FROM inspections WHERE id = %s AND user_id = %s",
        (inspection_id, g.user_id), one=True,
    )
    if inspection is None or not inspection["image_path"]:
        return jsonify({"error": "Image not found"}), 404

    directory, filename = os.path.split(os.path.join(UPLOAD_ROOT, inspection["image_path"]))
    return send_from_directory(directory, filename)


@bp.post("/inspections/hold-recommendation")
@token_required
def hold_recommendation():
    inspection = query(
        "SELECT id, defect_type, description, confidence FROM inspections "
        "WHERE user_id = %s AND is_battery = 1 AND analysis_status = 'COMPLETED' "
        "AND confidence >= 0.30 AND confidence <= 0.55 "
        "ORDER BY created_at DESC LIMIT 1",
        (g.user_id,),
        one=True,
    )
    if inspection is None:
        return jsonify({"error": "No item currently requires HOLD review"}), 404

    try:
        recommendation = recommend_action(
            inspection["defect_type"],
            inspection["description"],
            float(inspection["confidence"] or 0),
        )
    except AIUnavailable as error:
        return jsonify({"error": str(error)}), 503

    return jsonify({"inspection_id": inspection["id"], **recommendation})


@bp.post("/inspections/<int:inspection_id>/review")
@token_required
def review_inspection(inspection_id):
    body = request.get_json(silent=True) or {}
    decision = str(body.get("decision", "")).upper()
    if decision not in {"APPROVED", "REJECTED"}:
        return jsonify({"error": "decision must be APPROVED or REJECTED"}), 400

    inspection = query(
        "SELECT id, has_defect, defect_type FROM inspections "
        "WHERE id = %s AND user_id = %s AND is_battery = 1",
        (inspection_id, g.user_id),
        one=True,
    )
    if inspection is None:
        return jsonify({"error": "Inspection not found"}), 404

    # A human can override the AI's defect_type here — that's the actual "correction"
    # the AI Control Panel promises. Falls back to the AI's own call when not overridden.
    corrected_type = body.get("corrected_type")
    if corrected_type is not None:
        corrected_type = str(corrected_type).strip()
        if corrected_type not in DEFECT_TYPES:
            return jsonify({"error": f"corrected_type must be one of {DEFECT_TYPES}"}), 400
    else:
        corrected_type = inspection["defect_type"]

    note = str(body.get("note", ""))[:500] or "Reviewed via dashboard"

    execute(
        "INSERT INTO inspection_reviews "
        "(inspection_id, reviewer_id, reviewed_defect, corrected_type, correction_note, status) "
        "VALUES (%s, %s, %s, %s, %s, %s) "
        "ON DUPLICATE KEY UPDATE reviewed_defect = VALUES(reviewed_defect), "
        "corrected_type = VALUES(corrected_type), "
        "correction_note = VALUES(correction_note), status = VALUES(status)",
        (inspection_id, g.user_id, bool(inspection["has_defect"]),
         corrected_type, note, decision),
    )
    return jsonify({
        "inspection_id": inspection_id,
        "decision": decision,
        "corrected_type": corrected_type,
        "was_corrected": corrected_type != inspection["defect_type"],
    })


@bp.get("/dashboard")
@token_required
def dashboard():
    summary = query(
        "SELECT COUNT(*) AS total_inspected, "
        "COALESCE(SUM(has_defect), 0) AS defects_found "
        "FROM inspections WHERE user_id = %s AND is_battery = 1 "
        "AND analysis_status = 'COMPLETED'",
        (g.user_id,),
        one=True,
    )
    breakdown = query(
        "SELECT "
        "COALESCE(SUM(severity = 'critical'), 0) AS critical, "
        "COALESCE(SUM(severity = 'major'), 0) AS major, "
        "COALESCE(SUM(severity = 'minor'), 0) AS minor, "
        "COALESCE(SUM(severity = 'none'), 0) AS none "
        "FROM inspections WHERE user_id = %s AND is_battery = 1 "
        "AND analysis_status = 'COMPLETED'",
        (g.user_id,),
        one=True,
    )
    frequencies = query(
        "SELECT COALESCE(defect_type, 'UNKNOWN') AS label, COUNT(*) AS count "
        "FROM inspections WHERE user_id = %s AND is_battery = 1 "
        "AND analysis_status = 'COMPLETED' AND has_defect = 1 "
        "GROUP BY defect_type ORDER BY count DESC",
        (g.user_id,),
    )
    recent = query(
        "SELECT id, defect_type AS type, severity, confidence, created_at "
        "FROM inspections WHERE user_id = %s AND is_battery = 1 "
        "AND analysis_status = 'COMPLETED' ORDER BY created_at DESC LIMIT 10",
        (g.user_id,),
    )
    latest = query(
        "SELECT has_defect, confidence FROM inspections "
        "WHERE user_id = %s AND is_battery = 1 AND analysis_status = 'COMPLETED' "
        "ORDER BY created_at DESC LIMIT 1",
        (g.user_id,),
        one=True,
    )

    total = int(summary["total_inspected"] or 0)
    defects = int(summary["defects_found"] or 0)
    defect_rate = (defects / total * 100) if total else 0
    for row in recent:
        row["confidence"] = float(row["confidence"] or 0)

    if latest is None:
        current_status = "NORMAL"
    elif float(latest["confidence"] or 0) < 0.30:
        current_status = "REJECT"
    elif float(latest["confidence"] or 0) <= 0.55:
        current_status = "HOLD"
    else:
        current_status = "NORMAL"

    return jsonify({
        "totalInspected": total,
        "defectsFound": defects,
        "defectRate": round(defect_rate, 2),
        "yieldRate": round(100 - defect_rate, 2) if total else 0,
        "criticalAlerts": int(breakdown["critical"] or 0),
        "criticalBreakdown": {
            "critical": int(breakdown["critical"] or 0),
            "major": int(breakdown["major"] or 0),
            "minor": int(breakdown["minor"] or 0),
            "none": int(breakdown["none"] or 0),
        },
        "liveDetections": len(recent),
        "liveItems": recent,
        "defectFrequency": frequencies,
        "currentStatus": current_status,
    })
