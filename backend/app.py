# backend/ app.py - ประกอบร่าง Flask app จากทุกชิ้นที่สร้างไว้

import os

import mysql.connector
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from db import close_db
from routes.users import bp as users_bp
from routes.tasks import bp as tasks_bp
from routes.inspect import bp as inspect_bp
from routes.inspections import bp as inspections_bp
from routes.safety_check import bp as safety_check_bp

load_dotenv()

def create_app():
    app = Flask(__name__)

    # Comma-separated so local dev (5173) and a deployed Netlify domain can both call this API.
    frontend_origins = [
        origin.strip()
        for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    CORS(app, origins=frontend_origins)

    app.teardown_appcontext(close_db)

    app.register_blueprint(users_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(inspect_bp)
    app.register_blueprint(inspections_bp)
    app.register_blueprint(safety_check_bp)

    @app.get("/")
    def read_root():
        return jsonify({"message": "Hello backend!"})

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "No endpoint here"}), 404

    @app.errorhandler(mysql.connector.Error)
    def db_error(e):
        app.logger.error(f"DB error: {e}")
        return jsonify({"error": "Database error, please try again."}), 500

    @app.errorhandler(Exception)
    def unexpected(e):
        app.logger.exception(e)
        return jsonify({"error": "An unexpected error occurred."}), 500

    return app

app = create_app()

if __name__ == "__main__":
    app.run(port=5000, debug=True)
    