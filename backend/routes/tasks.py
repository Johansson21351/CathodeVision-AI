# backend/routes/tasks.py
from flask import Blueprint, request, jsonify, g

from db import query, execute
from auth import token_required
from ai import categorize_task, AIUnavailable

bp = Blueprint("tasks", __name__, url_prefix="/tasks")


@bp.get("")
@token_required
def list_tasks():
    # รองรับ /tasks?done=true&q=API&limit=10
    sql = "SELECT * FROM tasks WHERE owner_id = %s"
    params = [g.user_id]

    if request.args.get("done") in ("true", "false"):
        sql += " AND done = %s"
        params.append(request.args["done"] == "true")

    keyword = request.args.get("q", "").strip()
    if keyword:
        sql += " AND title LIKE %s"
        params.append(f"%{keyword}%")

    limit = min(request.args.get("limit", 50, type=int), 100)
    sql += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)

    rows = query(sql, tuple(params))
    for r in rows:
        r["done"] = bool(r["done"])
    return jsonify(rows)


@bp.post("")
@token_required
def create_task():
    d = request.get_json(silent=True) or {}
    title = str(d.get("title", "")).strip()
    if not title:
        return jsonify({"error": "ต้องระบุ title"}), 400
    if len(title) > 200:
        return jsonify({"error": "title ยาวเกิน 200 ตัวอักษร"}), 400

    new_id, _ = execute(
        "INSERT INTO tasks (title, done, owner_id) VALUES (%s, %s, %s)",
        (title, False, g.user_id),
    )
    task = query("SELECT * FROM tasks WHERE id = %s", (new_id,), one=True)
    task["done"] = bool(task["done"])
    return jsonify(task), 201


@bp.get("/<int:task_id>")
@token_required
def get_task(task_id):
    task = query(
        "SELECT * FROM tasks WHERE id = %s AND owner_id = %s",
        (task_id, g.user_id), one=True,
    )
    if task is None:
        return jsonify({"error": "ไม่พบงานนี้"}), 404
    task["done"] = bool(task["done"])
    return jsonify(task)


@bp.put("/<int:task_id>")
@token_required
def update_task(task_id):
    d = request.get_json(silent=True) or {}

    # ต้องเป็นงานของคนที่ถือ token นี้เท่านั้น
    task = query(
        "SELECT * FROM tasks WHERE id = %s AND owner_id = %s",
        (task_id, g.user_id), one=True,
    )
    if task is None:
        return jsonify({"error": "ไม่พบงานนี้"}), 404

    fields, params = [], []
    if "title" in d:
        title = str(d["title"]).strip()
        if not title:
            return jsonify({"error": "title ว่างไม่ได้"}), 400
        fields.append("title = %s")
        params.append(title)
    if "done" in d:
        fields.append("done = %s")
        params.append(bool(d["done"]))

    if not fields:
        return jsonify({"error": "ไม่มีอะไรให้แก้"}), 400

    params += [task_id, g.user_id]
    execute(
        f"UPDATE tasks SET {', '.join(fields)} WHERE id = %s AND owner_id = %s",
        tuple(params),
    )

    updated = query("SELECT * FROM tasks WHERE id = %s", (task_id,), one=True)
    updated["done"] = bool(updated["done"])
    return jsonify(updated)


@bp.delete("/<int:task_id>")
@token_required
def delete_task(task_id):
    _, affected = execute(
        "DELETE FROM tasks WHERE id = %s AND owner_id = %s",
        (task_id, g.user_id),
    )
    if affected == 0:
        return jsonify({"error": "ไม่พบงานนี้"}), 404
    return jsonify({"deleted": task_id})


@bp.post("/<int:task_id>/categorize")
@token_required
def categorize(task_id):
    task = query(
        "SELECT * FROM tasks WHERE id = %s AND owner_id = %s",
        (task_id, g.user_id), one=True,
    )
    if task is None:
        return jsonify({"error": "ไม่พบงานนี้"}), 404

    # มีผลอยู่แล้ว → คืนของเดิม ไม่เสียเงินเรียก AI ซ้ำ
    if task["categorized_at"] is not None:
        return jsonify({
            "category": task["category"],
            "priority": task["priority"],
            "estimated_minutes": task["est_minutes"],
            "confidence": task["ai_confidence"],
            "cached": True,
        })

    try:
        result = categorize_task(task["title"])
    except AIUnavailable as e:
        return jsonify({"error": str(e)}), 503

    execute(
        "UPDATE tasks SET category = %s, priority = %s, "
        "est_minutes = %s, ai_confidence = %s, categorized_at = NOW() "
        "WHERE id = %s",
        (result["category"], result["priority"],
         result["estimated_minutes"], result["confidence"], task_id),
    )
    return jsonify({**result, "cached": False})