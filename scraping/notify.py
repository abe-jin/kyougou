import csv
import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo
import requests

from env_loader import load_env

load_env()
from backup import auto_backup
auto_backup()

from s3_utils import download_csv, download_json, upload_json

SLACK_WEBHOOK_URL = os.getenv('SLACK_WEBHOOK_URL')
LINE_NOTIFY_TOKEN = os.getenv('LINE_NOTIFY_TOKEN')
WEBHOOK_URL = os.getenv('WEBHOOK_URL')
TEAMS_WEBHOOK_URL = os.getenv('TEAMS_WEBHOOK_URL')
SMS_API_URL = os.getenv('SMS_API_URL')
SMS_API_TOKEN = os.getenv('SMS_API_TOKEN')
GOOGLE_CHAT_WEBHOOK_URL = os.getenv('GOOGLE_CHAT_WEBHOOK_URL')

LINE_ENDPOINT = 'https://notify-api.line.me/api/notify'

SILENT_START = os.getenv('SILENT_START')
SILENT_END = os.getenv('SILENT_END')
TIMEZONE = os.getenv('TIMEZONE', 'UTC')

ALERT_STATE_KEY = os.getenv('ALERT_STATE_KEY', 'alert_state.json')
ALERT_SUPPRESS_COUNT = int(os.getenv('ALERT_SUPPRESS_COUNT', '3'))
ALERT_SUPPRESS_HOURS = int(os.getenv('ALERT_SUPPRESS_HOURS', '12'))


def is_silent_time() -> bool:
    if SILENT_START is None or SILENT_END is None:
        return False
    try:
        start = int(SILENT_START)
        end = int(SILENT_END)
    except ValueError:
        return False
    try:
        tz = ZoneInfo(TIMEZONE)
    except Exception:
        tz = None
    now = datetime.now(tz) if tz else datetime.now()
    h = now.hour
    if start <= end:
        return start <= h < end
    return h >= start or h < end


PRODUCTS_KEY = os.getenv('PRODUCTS_KEY', 'products.json')
PRICES_CSV_KEY = os.getenv('PRICES_CSV_KEY', 'prices.csv')
USERS_KEY = os.getenv('USERS_JSON_KEY', 'users.json')


def load_products():
    return download_json(PRODUCTS_KEY, [])

def load_users():
    return download_json(USERS_KEY, [])

_user_map = None

def get_user(email):
    global _user_map
    if _user_map is None:
        _user_map = {u.get('email'): u for u in load_users()}
    return _user_map.get(email)


_alert_state = download_json(ALERT_STATE_KEY, {}) or {}


def _save_state():
    upload_json(ALERT_STATE_KEY, _alert_state)


def _should_send(name: str) -> bool:
    state = _alert_state.get(name, {})
    last = state.get('last')
    count = state.get('count', 0)
    if last:
        try:
            dt = datetime.fromisoformat(last)
            if (datetime.utcnow() - dt).total_seconds() > ALERT_SUPPRESS_HOURS * 3600:
                count = 0
        except Exception:
            count = 0
    if count >= ALERT_SUPPRESS_COUNT:
        return False
    state['count'] = count + 1
    state['last'] = datetime.utcnow().isoformat()
    _alert_state[name] = state
    _save_state()
    return True


def _reset_count(name: str) -> None:
    if name in _alert_state and _alert_state[name].get('count'):
        _alert_state[name]['count'] = 0
        _save_state()


def load_history(csv_key):
    data = {}
    rows = download_csv(csv_key)
    for row in rows:
        name = row['name']
        price = int(row['price'])
        time = row['time']
        data.setdefault(name, []).append({'price': price, 'time': time})
    return data


def send_slack(message):
    if is_silent_time():
        return
    if SLACK_WEBHOOK_URL:
        requests.post(SLACK_WEBHOOK_URL, json={'text': message})


def send_line(message):
    if is_silent_time():
        return
    if LINE_NOTIFY_TOKEN:
        requests.post(
            LINE_ENDPOINT,
            headers={"Authorization": f"Bearer {LINE_NOTIFY_TOKEN}"},
            data={"message": message},
        )


def send_webhook(message):
    if is_silent_time():
        return
    if WEBHOOK_URL:
        requests.post(WEBHOOK_URL, json={"text": message})


def send_teams(message):
    if is_silent_time():
        return
    if TEAMS_WEBHOOK_URL:
        requests.post(TEAMS_WEBHOOK_URL, json={"text": message})


def send_sms(message):
    if is_silent_time():
        return
    if SMS_API_URL and SMS_API_TOKEN:
        requests.post(
            SMS_API_URL,
            headers={"Authorization": f"Bearer {SMS_API_TOKEN}"},
            json={"message": message},
        )


def send_chat(message):
    if is_silent_time():
        return
    if GOOGLE_CHAT_WEBHOOK_URL:
        requests.post(GOOGLE_CHAT_WEBHOOK_URL, json={"text": message})


def price_alert(product, message):
    name = product.get('name') or ''
    if _should_send(name):
        notify(product, message)


def notify(product, message):
    channel = product.get("notify")
    if not channel:
        user = get_user(product.get('owner'))
        channel = user.get('notify') if user else 'slack'
    if channel == "both":
        channels = ["slack", "line"]
    else:
        channels = [c.strip() for c in channel.split(",") if c.strip()]

    for ch in channels:
        if ch == "slack":
            send_slack(message)
        elif ch == "line":
            send_line(message)
        elif ch == "webhook":
            send_webhook(message)
        elif ch == "teams":
            send_teams(message)
        elif ch == "sms":
            send_sms(message)
        elif ch in ("chat", "googlechat", "gchat"):
            send_chat(message)
        else:
            print(message)


def check_and_notify(csv_key=os.getenv('PRICES_CSV_KEY', 'prices.csv')):
    products = load_products()
    history_data = load_history(csv_key)

    for p in products:
        name = p.get('name')
        drop_percent = p.get('dropPercent')
        below_price = p.get('belowPrice')
        history = history_data.get(name, [])
        if not history:
            continue
        latest = history[-1]['price']
        sent = False
        if below_price and latest <= below_price:
            price_alert(p, f'{name} price {latest} is below {below_price}')
            sent = True
        if drop_percent and len(history) >= 2:
            prev = history[-2]['price']
            if prev > 0 and latest <= prev * (1 - drop_percent / 100):
                price_alert(p, f'{name} price dropped {prev} -> {latest} (> {drop_percent}% )')
                sent = True
        if not sent:
            _reset_count(name)

if __name__ == '__main__':
    check_and_notify()