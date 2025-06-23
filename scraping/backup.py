import argparse
import os
from datetime import datetime

from env_loader import load_env
from s3_utils import download_text, upload_text

load_env()

CSV_KEY = os.getenv('PRICES_CSV_KEY', 'prices.csv')
JSON_KEY = os.getenv('PRICES_JSON_KEY', 'prices.json')
PRODUCTS_KEY = os.getenv('PRODUCTS_KEY', 'products.json')
USERS_KEY = os.getenv('USERS_JSON_KEY', 'users.json')
BACKUP_PREFIX = os.getenv('BACKUP_PREFIX', 'backup')
AUTO_BACKUP = os.getenv('AUTO_BACKUP', '1') != '0'

FILES = [CSV_KEY, JSON_KEY, PRODUCTS_KEY, USERS_KEY]


def backup():
    date = datetime.now().strftime('%Y%m%d')
    for key in FILES:
        data = download_text(key, None)
        if data is None:
            continue
        dest_key = f"{BACKUP_PREFIX}/{date}_{key}"
        upload_text(dest_key, data)
        print('Saved', dest_key)


def auto_backup():
    if not AUTO_BACKUP:
        return
    try:
        backup()
    except Exception as e:
        print('auto backup failed', e)


def restore(date: str):
    for key in FILES:
        src_key = f"{BACKUP_PREFIX}/{date}_{key}"
        data = download_text(src_key, None)
        if data is None:
            continue
        upload_text(key, data)
        print('Restored', key)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Backup or restore files to S3')
    parser.add_argument('--restore', help='date string YYYYMMDD to restore')
    args = parser.parse_args()

    if args.restore:
        restore(args.restore)
    else:
        backup()