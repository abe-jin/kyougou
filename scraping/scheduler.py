import os
import json
import time
from datetime import datetime

import schedule
from multiprocessing import Pool, cpu_count

from env_loader import load_env
from scrape_prices import fetch_price, log_error, optimal_pool_size
from notify import check_and_notify, send_slack
from s3_utils import download_json, append_csv
from erp_sync import push_price_to_erp, fetch_products_from_erp

load_env()
from backup import auto_backup
auto_backup()

PRODUCTS_KEY = os.getenv('PRODUCTS_KEY', 'products.json')
CSV_KEY = os.getenv('PRICES_CSV_KEY', 'prices.csv')


def load_products():
    return download_json(PRODUCTS_KEY, [])


def append_row(name, price, csv_key=CSV_KEY):
    now = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    append_csv(csv_key, [{'name': name, 'price': price, 'time': now}], fieldnames=['name', 'price', 'time'])


def scrape_product(index: int):
    products = load_products()
    if index < 0 or index >= len(products):
        return
    product = products[index]
    if product.get('paused'):
        return
    url = product.get('url')
    name = product.get('name')
    ns = product.get('nameSelector')
    ps = product.get('priceSelector')
    try:
        fetched_name, price = fetch_price(url, ns or 'span.productTitle', ps or 'span.price')
        # Use provided product name if fetch_price returns something else
        if fetched_name:
            name = fetched_name
        append_row(name, price)
        check_and_notify(CSV_KEY)
        push_price_to_erp(name, price)
    except Exception as e:
        msg = f'Error fetching {url}: {e}'
        print(msg)
        send_slack(msg)
        log_error(msg)


def schedule_jobs():
    fetch_products_from_erp()
    products = load_products()
    pool = Pool(optimal_pool_size(len(products)))

    def run_pool_job(idx):
        pool.apply_async(scrape_product, (idx,))

    for idx, p in enumerate(products):
        interval = p.get('interval', 24)
        schedule.every(interval).hours.do(run_pool_job, idx)

    while True:
        schedule.run_pending()
        time.sleep(1)


if __name__ == '__main__':
    schedule_jobs()