#backend/db.py - ไฟล์เดียวที่รู้จักฐานข้อมูลโดยตรง

import os
import mysql.connector
from flask import g
from dotenv import load_dotenv

load_dotenv()


def get_db():
    """ คืน connection ของ request นี้ - ถ้ายังไม่มีค่อยเปิดใหม่"""
    if "db" not in g:
        config = dict(
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
        )
        # Hosted MySQL (TiDB Cloud, Aiven, ...) requires TLS. DB_SSL_CA is the CA
        # file path; on Render use DB_SSL=true to verify against the system CAs.
        ssl_ca = os.getenv("DB_SSL_CA")
        if ssl_ca:
            config["ssl_ca"] = ssl_ca
        elif os.getenv("DB_SSL", "").lower() in ("1", "true", "yes"):
            import certifi
            config["ssl_ca"] = certifi.where()
        g.db = mysql.connector.connect(**config)
    return g.db


def close_db(e=None):
    """ Flask เรียกให้เองทุกครั้งที่ request จบ (ผูกไว้ใน app.py)"""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def query(sql, params=(), one=False):
    """สำหรับ SELECT - คืนผลเป็น dict  (หรือ list ของ dict) """
    cur = get_db().cursor(dictionary=True)
    cur.execute(sql, params)
    rows = cur.fetchall()
    cur.close()
    if one:
        return rows[0] if rows else None
    return rows


def execute(sql, params=()):
    """สำหรับ INSERT/UPDATE/DELETE"""
    db = get_db()
    cur = db.cursor()
    cur.execute(sql, params)
    db.commit()
    result = (cur.lastrowid, cur.rowcount) 
    cur.close()
    return result # (id ที่เพิ่งสร้าง, จำนวนแถวที่โดน)


def execute_many(statements):
    """statements = [(sql, params), (sql, params), ...] - ทำทั้งหมด หรือย้อนกลับทั้งหมด"""
    db = get_db()
    cur = db.cursor()
    try:
        db.start_transaction()
        for sql, params in statements:
            cur.execute(sql, params)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        cur.close()