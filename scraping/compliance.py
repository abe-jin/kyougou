import os
import statistics
from typing import List, Dict

from env_loader import load_env
from s3_utils import download_json
from notify import send_slack

load_env()
from backup import auto_backup
auto_backup()

PRICES_JSON_KEY = os.getenv('PRICES_JSON_KEY', 'prices.json')
COMPLIANCE_DIFF_THRESHOLD = float(os.getenv('COMPLIANCE_DIFF_THRESHOLD', '0.3'))
COMPLIANCE_MEDIAN_THRESHOLD = float(
    os.getenv('COMPLIANCE_MEDIAN_THRESHOLD', str(COMPLIANCE_DIFF_THRESHOLD))
)
COMPLIANCE_STD_THRESHOLD = float(os.getenv('COMPLIANCE_STD_THRESHOLD', '2'))
COMPLIANCE_MODE_THRESHOLD = float(
    os.getenv('COMPLIANCE_MODE_THRESHOLD', str(COMPLIANCE_DIFF_THRESHOLD))
)
COMPLIANCE_COLLUSION_DAYS = int(os.getenv('COMPLIANCE_COLLUSION_DAYS', '3'))
COMPLIANCE_WINDOW = int(os.getenv('COMPLIANCE_WINDOW', '5'))


def load_prices() -> Dict[str, List[Dict]]:
    return download_json(PRICES_JSON_KEY, {})


def check_price(name: str, new_price: int, history: List[Dict] | None = None) -> None:
    if history is None:
        history = load_prices().get(name, [])
    if not history:
        return
    recent = [h['price'] for h in history[-COMPLIANCE_WINDOW:]]
    if not recent:
        return
    avg = sum(recent) / len(recent)
    if avg <= 0:
        return
    diff_ratio = (avg - new_price) / avg
    if diff_ratio > COMPLIANCE_DIFF_THRESHOLD:
        send_slack(
            f'[Compliance] {name} price {new_price} is more than '
            f'{COMPLIANCE_DIFF_THRESHOLD * 100:.0f}% below market avg {avg:.1f}'
        )
    elif diff_ratio < -COMPLIANCE_DIFF_THRESHOLD:
        send_slack(
            f'[Compliance] {name} price {new_price} is more than '
            f'{COMPLIANCE_DIFF_THRESHOLD * 100:.0f}% above market avg {avg:.1f}'
        )
    median_val = statistics.median(recent)
    diff_ratio_med = abs(new_price - median_val) / median_val
    if diff_ratio_med > COMPLIANCE_MEDIAN_THRESHOLD:
        send_slack(
            f'[Compliance] {name} price {new_price} deviates '
            f'{diff_ratio_med * 100:.0f}% from median {median_val:.1f}'
        )

    if len(recent) > 1:
        std = statistics.stdev(recent)
        if std > 0:
            diff_std = abs(new_price - avg) / std
            if diff_std > COMPLIANCE_STD_THRESHOLD:
                send_slack(
                    f'[Compliance] {name} price {new_price} is '
                    f'{diff_std:.1f}σ from average {avg:.1f}'
                )

    mode_val = statistics.multimode(recent)[0]
    diff_ratio_mode = abs(new_price - mode_val) / mode_val
    if diff_ratio_mode > COMPLIANCE_MODE_THRESHOLD:
        send_slack(
            f'[Compliance] {name} price {new_price} deviates '
            f'{diff_ratio_mode * 100:.0f}% from mode {mode_val:.1f}'
        )

    matches = sum(abs(p - new_price) / new_price < 0.01 for p in recent)
    if matches >= COMPLIANCE_COLLUSION_DAYS:
        send_slack(
            f'[Compliance] {name} price {new_price} matches competitors '
            f'for {matches} entries (possible collusion)'
        )


if __name__ == '__main__':
    prices = load_prices()
    for name, history in prices.items():
        if history:
            check_price(name, history[-1]['price'], history)