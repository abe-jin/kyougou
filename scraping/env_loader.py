import os
import json
from pathlib import Path

from dotenv import load_dotenv
import boto3


def load_env():
    """Load variables from .env and optionally AWS Secrets Manager."""
    # Load .env file if present
    env_path = Path(__file__).resolve().parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()

    secret_name = os.getenv('AWS_SECRET_NAME')
    if secret_name:
        try:
            client = boto3.client('secretsmanager')
            response = client.get_secret_value(SecretId=secret_name)
            secret_str = response.get('SecretString')
            if secret_str:
                secrets = json.loads(secret_str)
                for k, v in secrets.items():
                    os.environ.setdefault(k, v)
        except Exception as e:
            print('Failed to load AWS secret:', e)