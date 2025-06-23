import os
import json
import requests
from datetime import datetime

from env_loader import load_env
from s3_utils import download_json, upload_json

load_env()
from backup import auto_backup
auto_backup()

ERP_API_URL = os.getenv('ERP_API_URL')
ERP_API_TOKEN = os.getenv('ERP_API_TOKEN')
PRODUCTS_KEY = os.getenv('PRODUCTS_KEY', 'products.json')
PRICES_JSON_KEY = os.getenv('PRICES_JSON_KEY', 'prices.json')

HEADERS = {
    'Authorization': f'Bearer {ERP_API_TOKEN}' if ERP_API_TOKEN else '',
    'Content-Type': 'application/json',
}


def fetch_products_from_erp():
    """Retrieve product list from ERP and store locally."""
    if not ERP_API_URL:
        print('ERP_API_URL not set')
        return
    try:
        resp = requests.get(f'{ERP_API_URL}/products', headers=HEADERS, timeout=10)
        resp.raise_for_status()
        products = resp.json()
        upload_json(PRODUCTS_KEY, products)
        print('Synced products from ERP')
    except Exception as e:
        print('ERP fetch error', e)


def push_price_to_erp(name: str, price: int):
    """Send single price update to ERP."""
    if not ERP_API_URL:
        return
    data = {'name': name, 'price': price, 'time': datetime.utcnow().isoformat()}
    try:
        requests.post(
            f'{ERP_API_URL}/prices',
            headers=HEADERS,
            data=json.dumps(data),
            timeout=10,
        )
    except Exception as e:
        print('ERP push error', e)


if __name__ == '__main__':
    fetch_products_from_erp()