import os
import json
from pathlib import Path

try:
    from dotenv import load_dotenv
except Exception:  # python-dotenv not installed
    def load_dotenv(*args, **kwargs):  # type: ignore
        pass

try:
    import boto3
except Exception:  # boto3 not installed
    boto3 = None

_loaded = False


def load_env():
    """Load variables from .env and optionally AWS Secrets Manager."""
    global _loaded
    if _loaded:
        return
    _loaded = True
    # Load .env file if present
    env_path = Path(__file__).resolve().parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()

    secret_name = os.getenv('AWS_SECRET_NAME')
    if secret_name:
        if boto3 is None:
            print('boto3 not available; skipping AWS Secrets Manager')
            return
        region = os.getenv('AWS_REGION') or os.getenv('AWS_DEFAULT_REGION')
        if not region:
            print('AWS secret requested but region not specified; skipping')
            return
        try:
            client = boto3.client('secretsmanager', region_name=region)
            response = client.get_secret_value(SecretId=secret_name)
            secret_str = response.get('SecretString')
            if secret_str:
                secrets = json.loads(secret_str)
                for k, v in secrets.items():
                    os.environ.setdefault(k, v)
        except Exception as e:
            print('Failed to load AWS secret:', e)
