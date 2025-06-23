import os
import json
import csv
import io

try:
    import boto3
except Exception:  # boto3 not installed
    boto3 = None

try:
    from google.cloud import firestore
except Exception:  # missing dependency or other import failure
    firestore = None
from env_loader import load_env

load_env()

S3_BUCKET = os.getenv("S3_BUCKET")
FIRESTORE_PROJECT = os.getenv("FIRESTORE_PROJECT")
FIRESTORE_COLLECTION = os.getenv("FIRESTORE_COLLECTION", "files")

s3 = boto3.client("s3") if S3_BUCKET and boto3 is not None else None
if FIRESTORE_PROJECT and firestore is not None:
    try:
        fs = firestore.Client(project=FIRESTORE_PROJECT)
    except Exception as e:  # credentials or config error
        print("Failed to init Firestore client:", e)
        fs = None
else:
    fs = None


def download_text(key: str, default: str = "") -> str:
    if fs:
        try:
            doc = fs.collection(FIRESTORE_COLLECTION).document(key).get()
            if doc.exists:
                data = doc.to_dict() or {}
                if "text" in data:
                    return data.get("text", default)
                if "json" in data:
                    return json.dumps(data.get("json"))
        except Exception as e:
            print("firestore download error", e)
        return default
    if not S3_BUCKET or not s3:
        if os.path.exists(key):
            with open(key, encoding="utf-8") as f:
                return f.read()
        return default
    try:
        obj = s3.get_object(Bucket=S3_BUCKET, Key=key)
        return obj["Body"].read().decode("utf-8")
    except Exception as e:
        # handle missing object or other client errors generically
        print("s3 download error", e)
        return default


def upload_text(key: str, text: str) -> None:
    if fs:
        try:
            fs.collection(FIRESTORE_COLLECTION).document(key).set({"text": text})
            return
        except Exception as e:
            print("firestore upload error", e)
    if not S3_BUCKET or not s3:
        os.makedirs(os.path.dirname(key) or ".", exist_ok=True)
        with open(key, "w", encoding="utf-8") as f:
            f.write(text)
        return
    s3.put_object(Bucket=S3_BUCKET, Key=key, Body=text.encode("utf-8"))


def download_json(key: str, default=None):
    if fs:
        try:
            doc = fs.collection(FIRESTORE_COLLECTION).document(key).get()
            if doc.exists:
                data = doc.to_dict() or {}
                if "json" in data:
                    return data["json"]
                if "text" in data:
                    return json.loads(data["text"])
        except Exception as e:
            print("firestore download error", e)
        return default if default is not None else {}
    text = download_text(key, "")
    if not text:
        return default if default is not None else {}
    try:
        return json.loads(text)
    except Exception as e:
        print("json decode error", e)
        return default if default is not None else {}


def upload_json(key: str, data) -> None:
    if fs:
        try:
            fs.collection(FIRESTORE_COLLECTION).document(key).set({"json": data})
            return
        except Exception as e:
            print("firestore upload error", e)
    upload_text(key, json.dumps(data, ensure_ascii=False, indent=2))


def download_csv(key: str):
    text = download_text(key, "")
    if not text:
        return []
    f = io.StringIO(text)
    reader = csv.DictReader(f)
    return list(reader)


def append_csv(key: str, rows, fieldnames):
    existing = download_text(key, "")
    output = io.StringIO()
    if existing:
        output.write(existing)
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    if not existing:
        writer.writeheader()
    else:
        output.seek(0, io.SEEK_END)
    for row in rows:
        writer.writerow(row)
    upload_text(key, output.getvalue())


def append_text(key: str, text: str):
    existing = download_text(key, "")
    upload_text(key, existing + text)

__all__ = [
    "download_text",
    "upload_text",
    "download_json",
    "upload_json",
    "download_csv",
    "append_csv",
    "append_text",
]