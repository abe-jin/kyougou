import csv
import json
import os
from collections import defaultdict

from env_loader import load_env

from s3_utils import download_csv, upload_json

load_env()
from backup import auto_backup
auto_backup()


def convert(csv_key=os.getenv('PRICES_CSV_KEY', 'prices.csv'), json_key=os.getenv('PRICES_JSON_KEY', 'prices.json')):
    history = defaultdict(list)
    rows = download_csv(csv_key)
    for row in rows:
        name = row['name']
        price = int(row['price'])
        time = row['time']
        entry = {
            'price': price,
            'reviews': int(row.get('reviews') or 0),
            'rating': float(row.get('rating') or 0),
            'rank': int(row.get('rank') or 0),
            'trend': row.get('trend') or '',
            'time': time,
        }
        history[name].append(entry)

    upload_json(json_key, history)

if __name__ == '__main__':
    convert()