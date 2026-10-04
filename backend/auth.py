# backend/auth.py - hash รหัสผ่าน, ออก/ตรวจ JWT token
import os
import datetime
from functools import wraps

import jwt # pip install pyjwt
from flask import request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

SECRET = os.getenv("JWT_SECRET")


def hash_password(p):
    return generate_password_hash(p) #ตอนสมัคร


def verify_password(p, hashed):
    return check_password_hash(hashed, p) #ตอน login

def create_token(user_id):
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + datetime.timedelta(hours=24),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]  # ตัด "Bearer " ออก
        else:
            # <img>/<video> tags can't set custom headers, so allow a query-param
            # fallback for routes that serve files directly into those tags.
            token = request.args.get("token", "")
            if not token:
                return jsonify({"error": "ยังไม่ได้ login"}), 401

        try:
            payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return  jsonify({"error": "token หมดอายุ กรุณา login ใหม่"}), 401
        except jwt.PyJWTError:
            return jsonify({"error": "token ไม่ถูกต้อง"}),401

        g.user_id = int(payload["sub"])
        return fn(*args, **kwargs)

    return wrapper