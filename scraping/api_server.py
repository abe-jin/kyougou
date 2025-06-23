from flask import Flask, jsonify, request
import json
import os
import hashlib
import datetime
from zoneinfo import ZoneInfo
import time
import jwt
from functools import wraps
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from s3_utils import download_json, upload_json, append_text
from env_loader import load_env

load_env()
from backup import auto_backup
auto_backup()

LOG_FILE = os.getenv(
    "LOG_FILE", os.path.join(os.path.dirname(__file__), "..", "operation.log")
)

app = Flask(__name__)

# simple in-memory rate limiter {key: [timestamps]}
RATE_LIMIT = {}
REQUESTS_PER_MINUTE = int(os.getenv("REQUESTS_PER_MINUTE", "60"))

PRICES_JSON_KEY = os.getenv("PRICES_JSON_KEY", "prices.json")

USERS_JSON_KEY = os.getenv("USERS_JSON_KEY", "users.json")

JWT_SECRET = os.getenv("JWT_SECRET", "secret")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")


def load_users(key: str = USERS_JSON_KEY):
    return download_json(key, [])


def save_users(data, key: str = USERS_JSON_KEY):
    upload_json(key, data)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def log_operation(user: str, action: str) -> None:
    entry = {
        "time": datetime.datetime.utcnow().isoformat(),
        "user": user,
        "action": action,
    }
    try:
        append_text(LOG_FILE, json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as e:
        print("log error", e)


def check_rate_limit(key: str, limit: int = REQUESTS_PER_MINUTE) -> bool:
    """Return True if request allowed, False if limit exceeded."""
    now = time.time()
    history = RATE_LIMIT.get(key, [])
    history = [t for t in history if now - t < 60]
    if len(history) >= limit:
        RATE_LIMIT[key] = history
        return False
    history.append(now)
    RATE_LIMIT[key] = history
    return True


def load_prices(key: str = PRICES_JSON_KEY):
    return download_json(key, {})


def requires_auth(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not auth:
            return jsonify({"error": "unauthorized"}), 401
        try:
            request.user = jwt.decode(auth, JWT_SECRET, algorithms=["HS256"])
        except jwt.InvalidTokenError:
            return jsonify({"error": "unauthorized"}), 401
        return func(*args, **kwargs)

    return wrapper


@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


@app.route("/api/prices")
@requires_auth
def api_prices():
    key = f"{request.remote_addr}:prices"
    if not check_rate_limit(key):
        return jsonify({"error": "too_many"}), 429
    data = load_prices()
    tz = ZoneInfo(request.user.get("tz", "UTC"))
    for history in data.values():
        for item in history:
            try:
                dt = datetime.datetime.fromisoformat(item["time"].replace("Z", "+00:00"))
                item["time"] = dt.astimezone(tz).strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                pass
    return jsonify(data)


@app.route("/api/register", methods=["POST"])
def api_register():
    key = f"{request.remote_addr}:register"
    if not check_rate_limit(key):
        return jsonify({"error": "too_many"}), 429
    info = request.get_json() or {}
    email = info.get("email")
    password = info.get("password")
    role = info.get("role", "user")
    if not email or not password:
        return jsonify({"error": "missing"}), 400
    users = load_users()
    if any(u["email"] == email for u in users):
        return jsonify({"error": "exists"}), 400
    tz = info.get("tz", "UTC")
    notify = info.get("notify", "slack")
    users.append({"email": email, "password": hash_password(password), "role": role, "tz": tz, "notify": notify})
    save_users(users)
    log_operation(email, "register")
    return jsonify({"status": "ok"})


@app.route("/api/login", methods=["POST"])
def api_login():
    key = f"{request.remote_addr}:login"
    if not check_rate_limit(key):
        return jsonify({"error": "too_many"}), 429
    info = request.get_json() or {}
    email = info.get("email")
    password = info.get("password")
    users = load_users()
    for u in users:
        if u["email"] == email and u["password"] == hash_password(password):
            payload = {
                "email": email,
                "role": u.get("role"),
                "tz": u.get("tz", "UTC"),
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
            }
            token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
            log_operation(email, "login")
            return jsonify({"token": token})
    return jsonify({"error": "invalid"}), 401


@app.route("/api/oauth/google", methods=["POST"])
def api_oauth_google():
    key = f"{request.remote_addr}:oauth"
    if not check_rate_limit(key):
        return jsonify({"error": "too_many"}), 429
    info = request.get_json() or {}
    token = info.get("token")
    if not token:
        return jsonify({"error": "missing"}), 400
    try:
        idinfo = google_id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        email = idinfo.get("email")
    except Exception:
        return jsonify({"error": "invalid"}), 401
    users = load_users()
    user = next((u for u in users if u.get("email") == email), None)
    if not user:
        user = {"email": email, "role": "user", "tz": "UTC"}
        users.append(user)
        save_users(users)
    payload = {
        "email": email,
        "role": user.get("role"),
        "tz": user.get("tz", "UTC"),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
    }
    jwt_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    log_operation(email, "oauth_login")
    return jsonify({"token": jwt_token})


@app.route("/api/prefs", methods=["GET", "POST"])
@requires_auth
def api_prefs():
    key = f"{request.remote_addr}:prefs"
    if not check_rate_limit(key):
        return jsonify({"error": "too_many"}), 429
    users = load_users()
    user = next((u for u in users if u.get("email") == request.user.get("email")), None)
    if not user:
        return jsonify({"error": "notfound"}), 404
    if request.method == "GET":
        return jsonify(user.get("prefs", {}))
    prefs = request.get_json() or {}
    user["prefs"] = prefs
    save_users(users)
    log_operation(user["email"], "update_prefs")
    return jsonify({"status": "ok", "prefs": prefs})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))