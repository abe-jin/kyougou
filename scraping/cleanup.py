import csv
import io
import json
import os
from datetime import datetime, timedelta

from env_loader import load_env
from s3_utils import download_text, upload_text, download_json, upload_json

load_env()
from backup import auto_backup
auto_backup()

LOG_FILE = os.getenv('LOG_FILE', os.path.join(os.path.dirname(__file__), '..', 'operation.log'))
PRICES_CSV_KEY = os.getenv('PRICES_CSV_KEY', 'prices.csv')
PRICES_JSON_KEY = os.getenv('PRICES_JSON_KEY', 'prices.json')
LOG_RETENTION_DAYS = int(os.getenv('LOG_RETENTION_DAYS', '30'))
HISTORY_RETENTION_DAYS = int(os.getenv('HISTORY_RETENTION_DAYS', '90'))


ISO_FORMAT = '%Y-%m-%dT%H:%M:%S'
CSV_FORMAT = '%Y-%m-%d %H:%M:%S'


def cleanup_logs(log_file: str = LOG_FILE, days: int = LOG_RETENTION_DAYS) -> None:
    cutoff = datetime.utcnow() - timedelta(days=days)
    text = download_text(log_file, '')
    if not text:
        return
    lines = []
    for line in text.splitlines():
        try:
            entry = json.loads(line)
            ts = datetime.fromisoformat(entry.get('time'))
            if ts >= cutoff:
                lines.append(json.dumps(entry, ensure_ascii=False))
        except Exception:
            # keep malformed lines
            lines.append(line)
    upload_text(log_file, '\n'.join(lines) + ('\n' if lines else ''))


def cleanup_history(csv_key: str = PRICES_CSV_KEY, json_key: str = PRICES_JSON_KEY, days: int = HISTORY_RETENTION_DAYS) -> None:
    cutoff = datetime.utcnow() - timedelta(days=days)

    # CSV cleanup
    csv_text = download_text(csv_key, '')
    if csv_text:
        f = io.StringIO(csv_text)
        reader = csv.DictReader(f)
        rows = [r for r in reader if datetime.strptime(r['time'], CSV_FORMAT) >= cutoff]
        out = io.StringIO()
        writer = csv.DictWriter(out, fieldnames=['name', 'price', 'time'])
        if rows:
            writer.writeheader()
            for r in rows:
                writer.writerow(r)
        upload_text(csv_key, out.getvalue())

    # JSON cleanup
    data = download_json(json_key, {})
    changed = False
    for name, history in list(data.items()):
        new_hist = [h for h in history if datetime.fromisoformat(h['time']) >= cutoff]
        if len(new_hist) != len(history):
            changed = True
            if new_hist:
                data[name] = new_hist
            else:
                del data[name]
    if changed:
        upload_json(json_key, data)


if __name__ == '__main__':
    cleanup_logs()
    cleanup_history()