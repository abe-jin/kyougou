import os
import time
from datetime import datetime
import requests
from env_loader import load_env
from s3_utils import download_json, upload_json
from notify import send_slack
from compliance import check_price

load_env()
from backup import auto_backup
auto_backup()

PRICES_JSON_KEY = os.getenv('PRICES_JSON_KEY', 'prices.json')
PRODUCTS_KEY = os.getenv('PRODUCTS_KEY', 'products.json')
EC_API_URL = os.getenv('EC_API_URL')
EC_API_TOKEN = os.getenv('EC_API_TOKEN')
REPRICE_MARGIN_PERCENT = float(os.getenv('REPRICE_MARGIN_PERCENT', '1'))
EC_PRICES_KEY = os.getenv('EC_PRICES_KEY', 'ec_prices.json')
PENDING_PRICES_KEY = os.getenv('PENDING_PRICES_KEY', 'pending_prices.json')


def load_prices():
    return download_json(PRICES_JSON_KEY, {})


def load_products():
    return download_json(PRODUCTS_KEY, [])


def load_ec_prices():
    return download_json(EC_PRICES_KEY, {})


def save_ec_prices(data):
    upload_json(EC_PRICES_KEY, data)


def load_pending():
    return download_json(PENDING_PRICES_KEY, [])


def save_pending(data):
    upload_json(PENDING_PRICES_KEY, data)


def calc_new_price(history, margin_percent, min_price=0):
    if not history:
        return None
    competitor_min = min(h["price"] for h in history)
    price = int(competitor_min * (1 - margin_percent / 100))
    price = max(price, 1)
    if price < (min_price or 0):
        return None
    return price


def update_price(name: str, ec_id: str, price: int, current: int = 0, min_price: int = 0) -> bool:
    if price is None or price < (min_price or 0):
        send_slack('最低価格を下回るため変更しませんでした')
        return False
    if current:
        diff = abs(price - current) / current
        if diff >= 0.1:
            pending = load_pending()
            pending.append({
                'id': int(time.time() * 1000),
                'name': name,
                'ecId': ec_id,
                'oldPrice': current,
                'newPrice': price,
                'time': datetime.utcnow().isoformat(),
            })
            save_pending(pending)
            send_slack(f'{name} price change {current} -> {price} pending approval')
            return False
    if not EC_API_URL or not EC_API_TOKEN:
        print('EC API not configured')
        return False
    url = f"{EC_API_URL}/products/{ec_id}/price"
    delay = 1
    last_error = ''
    for attempt in range(3):
        try:
            resp = requests.post(
                url,
                json={'price': price},
                headers={'Authorization': f'Bearer {EC_API_TOKEN}'},
                timeout=10,
            )
            if resp.status_code == 200:
                send_slack(f'Updated price for {ec_id} to {price}')
                ec_prices = load_ec_prices()
                ec_prices[ec_id] = price
                save_ec_prices(ec_prices)
                return True
            last_error = f'{resp.status_code} {resp.text}'
        except requests.RequestException as e:
            last_error = str(e)
        if attempt < 2:
            time.sleep(delay)
            delay *= 2
    msg = f'Failed to update price for {ec_id}: {last_error}'
    print(msg)
    send_slack(msg)
    return False


def main():
    products = load_products()
    prices = load_prices()
    ec_prices = load_ec_prices()
    for p in products:
        ec_id = p.get('ecId')
        name = p.get('name')
        if not ec_id or not name:
            continue
        history = prices.get(name, [])
        min_price = p.get('minPrice', 0)
        new_price = calc_new_price(history, REPRICE_MARGIN_PERCENT, min_price)
        if new_price is not None:
            check_price(name, new_price, history)
        current = ec_prices.get(ec_id, 0)
        if update_price(name, ec_id, new_price, current, min_price):
            ec_prices[ec_id] = new_price


if __name__ == '__main__':
    main()