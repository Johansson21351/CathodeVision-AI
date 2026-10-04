# backend/routes/users.py
from flask import Blueprint, request, jsonify, g
import re

from db import query, execute
from auth import hash_password, verify_password, create_token, token_required

bp = Blueprint("users", __name__)


@bp.post("/register")
def register():
    d = request.get_json(silent=True) or {}
    username = str(d.get("username", "")).strip()
    email = str(d.get("email", "")).strip()
    password = d.get("password", "")
    personal_key = d.get("personal_key", "")

    if not username or not email or not password or not personal_key:
        return jsonify({"error": "กรอกข้อมูลให้ครบ"}), 400
    if not isinstance(password, str) or len(password) < 8:
        return jsonify({"error": "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว"}), 400
    if not isinstance(personal_key, str) or not re.fullmatch(r"\d{4}", personal_key):
        return jsonify({"error": "รหัสส่วนตัวต้องเป็นตัวเลข 4 หลัก"}), 400
    if query("SELECT id FROM users WHERE username = %s", (username,), one=True):
        return jsonify({"error": "ชื่อผู้ใช้นี้ถูกใช้แล้ว"}), 409

    new_id, _ = execute(
        "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
        (username, email, hash_password(password)),
    )
    execute(
        "INSERT INTO user_password_keys (user_id, key_hash) VALUES (%s, %s)",
        (new_id, hash_password(personal_key)),
    )
    return jsonify({"id": new_id, "username": username}), 201


@bp.post("/login")
def login():
    d = request.get_json(silent=True) or {}
    username = str(d.get("username", "")).strip()
    password = d.get("password", "")

    user = query(
        "SELECT id, username, password FROM users WHERE username = %s",
        (username,), one=True,
    )
    # รวม 2 กรณีเป็นข้อความเดียว กันคนร้ายเดาว่ามี username นี้ไหม
    if user is None or not verify_password(password, user["password"]):
        return jsonify({"error": "ชื่อหรือรหัสผ่านไม่ถูกต้อง"}), 401

    return jsonify({
        "token": create_token(user["id"]),
        "username": user["username"],
    })


@bp.post("/forgot-password")
def forgot_password():
    d = request.get_json(silent=True) or {}
    email = str(d.get("email", "")).strip()

    if not email:
        return jsonify({"error": "กรุณากรอกอีเมล"}), 400

    user = query("SELECT id FROM users WHERE email = %s", (email,), one=True)
    if user is None:
        return jsonify({"error": "ไม่พบอีเมลนี้ในระบบ"}), 404

    return jsonify({"message": "พบอีเมลในระบบ สามารถตั้งรหัสผ่านใหม่ได้"})


@bp.post("/reset-password")
def reset_password():
    d = request.get_json(silent=True) or {}
    email = str(d.get("email", "")).strip()
    password = d.get("password", "")
    personal_key = d.get("personal_key", "")

    if not email or not password or not personal_key:
        return jsonify({"error": "กรุณากรอกอีเมล รหัสส่วนตัว และรหัสผ่านใหม่"}), 400
    if not isinstance(password, str) or len(password) < 8:
        return jsonify({"error": "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว"}), 400
    if not isinstance(personal_key, str) or not re.fullmatch(r"\d{4}", personal_key):
        return jsonify({"error": "รหัสส่วนตัวต้องเป็นตัวเลข 4 หลัก"}), 400

    user = query("SELECT id FROM users WHERE email = %s", (email,), one=True)
    if user is None:
        return jsonify({"error": "ไม่พบอีเมลนี้ในระบบ"}), 404

    key_record = query(
        "SELECT key_hash, failed_attempts, locked_until, "
        "(locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked "
        "FROM user_password_keys WHERE user_id = %s",
        (user["id"],),
        one=True,
    )
    if key_record is None:
        return jsonify({"error": "บัญชีนี้ยังไม่มีรหัสส่วนตัว กรุณาติดต่อผู้ดูแลระบบ"}), 403
    if key_record["is_locked"]:
        return jsonify({"error": "ใส่รหัสผิดหลายครั้ง กรุณาลองใหม่อีก 15 นาที"}), 429
    if not verify_password(personal_key, key_record["key_hash"]):
        execute(
            "UPDATE user_password_keys "
            "SET locked_until = CASE WHEN failed_attempts + 1 >= 5 "
            "THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) ELSE locked_until END, "
            "failed_attempts = failed_attempts + 1 "
            "WHERE user_id = %s",
            (user["id"],),
        )
        return jsonify({"error": "รหัสส่วนตัวไม่ถูกต้อง"}), 401

    execute(
        "UPDATE users SET password = %s WHERE id = %s",
        (hash_password(password), user["id"]),
    )
    execute(
        "UPDATE user_password_keys SET failed_attempts = 0, locked_until = NULL "
        "WHERE user_id = %s",
        (user["id"],),
    )
    return jsonify({"message": "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบ"})


@bp.get("/me")
@token_required
def me():
    user = query(
        "SELECT id, username, email FROM users WHERE id = %s",
        (g.user_id,), one=True,
    )
    if user is None:
        return jsonify({"error": "ไม่พบผู้ใช้"}), 404
    return jsonify(user)