import os
import time
from datetime import datetime
from multiprocessing import Pool, cpu_count

import requests
from bs4 import BeautifulSoup

from env_loader import load_env
from notify import send_slack
from s3_utils import append_csv, append_text, download_json, upload_json
from difflib import SequenceMatcher
import json

load_env()
from backup import auto_backup
auto_backup()

URLS = [
    # Example product URLs from Rakuten or Amazon
    # 'https://example.com/product1',
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36'
}

LOG_KEY = os.getenv('ERROR_LOG_KEY', 'error.log')
BASELINE_DIR = os.path.join(os.path.dirname(__file__), 'baselines')
STRUCTURE_THRESHOLD = float(os.getenv('STRUCTURE_THRESHOLD', '0.8'))
OOS_KEYWORDS = [k for k in os.getenv('OOS_KEYWORDS', '在庫切れ,売り切れ,在庫なし,販売終了,販売停止').split(',') if k]
SUGGESTION_KEY = os.getenv('SUGGESTION_KEY', 'selector_suggestions.json')

MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
PROXIES = [p for p in os.getenv('PROXY_LIST', '').split(',') if p]
LATENCY_THRESHOLD = float(os.getenv('LATENCY_THRESHOLD', '5'))  # seconds
MAX_WORKERS_ENV = int(os.getenv('SCRAPER_MAX_WORKERS', '0'))
RATE_LIMIT_PER_MIN = int(os.getenv('SCRAPER_RATE_LIMIT', '0'))
_proxy_index = 0
_last_requests = []


def optimal_pool_size(num_tasks: int) -> int:
    """Determine pool size from CPU count, env hints, and API rate limit."""
    workers = cpu_count() or 1
    if MAX_WORKERS_ENV > 0:
        workers = min(workers, MAX_WORKERS_ENV)
    if RATE_LIMIT_PER_MIN > 0:
        workers = min(workers, max(1, RATE_LIMIT_PER_MIN))
    return max(1, min(workers, num_tasks))


def current_proxy():
    if not PROXIES:
        return None
    return {'http': PROXIES[_proxy_index], 'https': PROXIES[_proxy_index]}


def switch_proxy():
    global _proxy_index
    if PROXIES:
        _proxy_index = (_proxy_index + 1) % len(PROXIES)
        send_slack(f'Switching proxy to {PROXIES[_proxy_index]}')


def respect_rate_limit():
    if RATE_LIMIT_PER_MIN <= 0:
        return
    now = time.time()
    # purge entries older than 60s
    while _last_requests and now - _last_requests[0] > 60:
        _last_requests.pop(0)
    if len(_last_requests) >= RATE_LIMIT_PER_MIN:
        sleep_time = 60 - (now - _last_requests[0])
        if sleep_time > 0:
            time.sleep(sleep_time)
    _last_requests.append(time.time())


def log_error(message, log_key: str = LOG_KEY) -> None:
    """Append error message with timestamp."""
    timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    append_text(log_key, f'{timestamp} {message}\n')


def baseline_path(url: str) -> str:
    safe = url.replace('://', '_').replace('/', '_')
    return os.path.join(BASELINE_DIR, f'{safe}.html')


def save_baseline(url: str, html: str) -> None:
    os.makedirs(BASELINE_DIR, exist_ok=True)
    with open(baseline_path(url), 'w', encoding='utf-8') as f:
        f.write(html)


def load_baseline(url: str) -> str | None:
    path = baseline_path(url)
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return f.read()
    return None


def check_structure_change(url: str, html: str) -> None:
    old = load_baseline(url)
    if not old:
        save_baseline(url, html)
        return
    ratio = SequenceMatcher(None, old, html).ratio()
    if ratio < STRUCTURE_THRESHOLD:
        send_slack(f'Selector may need update for {url}')
        log_error(f'Structure changed for {url} (ratio {ratio:.2f})')
        save_baseline(url, html)


def suggest_selectors(url: str, html: str, name_sel: str, price_sel: str) -> dict:
    """Compare old baseline and new HTML to suggest new selectors."""
    old_html = load_baseline(url)
    if not old_html:
        return {}
    soup_old = BeautifulSoup(old_html, 'html.parser')
    soup_new = BeautifulSoup(html, 'html.parser')

    def find_new(old_elem):
        if not old_elem:
            return None
        # try id
        id_attr = old_elem.get('id')
        if id_attr:
            found = soup_new.find(id=id_attr)
            if found:
                return found
        # try class
        classes = old_elem.get('class') or []
        for cls in classes:
            found = soup_new.find(old_elem.name, class_=cls)
            if found:
                return found
        # try text match
        text = old_elem.get_text(strip=True)
        if text:
            found = soup_new.find(string=lambda s: s and text in s)
            if found:
                return found.parent
        return None

    def build_selector(elem):
        if not elem:
            return None
        if elem.get('id'):
            return f"{elem.name}#{elem.get('id')}"
        cls = (elem.get('class') or [None])[0]
        return f"{elem.name}.{cls}" if cls else elem.name

    result = {}
    old_name = soup_old.select_one(name_sel)
    new_name = find_new(old_name)
    if new_name and not soup_new.select_one(name_sel):
        result['nameSelector'] = build_selector(new_name)
    old_price = soup_old.select_one(price_sel)
    new_price = find_new(old_price)
    if new_price and not soup_new.select_one(price_sel):
        result['priceSelector'] = build_selector(new_price)
    return result


def record_suggestion(url: str, suggestions: dict) -> None:
    if not suggestions:
        return
    data = download_json(SUGGESTION_KEY, []) or []
    data = [s for s in data if s.get('url') != url]
    suggestions['url'] = url
    suggestions['time'] = datetime.utcnow().isoformat() + 'Z'
    data.append(suggestions)
    upload_json(SUGGESTION_KEY, data)


def fetch_price(
    url,
    name_selector='span.productTitle',
    price_selector='span.price',
    review_selector=None,
    rating_selector=None,
    rank_selector=None,
    trend_selector=None,
):
    for _ in range(len(PROXIES) or 1):
        proxy = current_proxy()
        for attempt in range(MAX_RETRIES):
            start = time.time()
            try:
                respect_rate_limit()
                resp = requests.get(
                    url, headers=HEADERS, proxies=proxy, timeout=10
                )
                latency = time.time() - start
                if latency > LATENCY_THRESHOLD:
                    send_slack(f'Response delay {latency:.1f}s for {url}')
                if resp.status_code >= 500 or resp.status_code == 429:
                    raise requests.HTTPError(
                        f'status {resp.status_code}', response=resp
                    )
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, 'html.parser')
                name_elem = soup.select_one(name_selector)
                price_elem = soup.select_one(price_selector)
                review_elem = soup.select_one(review_selector) if review_selector else None
                rating_elem = soup.select_one(rating_selector) if rating_selector else None
                rank_elem = soup.select_one(rank_selector) if rank_selector else None
                trend_elem = soup.select_one(trend_selector) if trend_selector else None
                if not name_elem or not price_elem:
                    check_structure_change(url, resp.text)
                    sugg = suggest_selectors(url, resp.text, name_selector, price_selector)
                    record_suggestion(url, sugg)
                    msg = f'selector not found for {url}'
                    if sugg:
                        parts = []
                        if sugg.get('nameSelector'):
                            parts.append(f"name: {sugg['nameSelector']}")
                        if sugg.get('priceSelector'):
                            parts.append(f"price: {sugg['priceSelector']}")
                        msg += ' suggested ' + ', '.join(parts)
                    send_slack(msg)
                    raise ValueError('selector not found')
                name = name_elem.get_text(strip=True)
                price_text = price_elem.get_text(strip=True)
                price = int(''.join(filter(str.isdigit, price_text)))
                reviews = None
                if review_elem:
                    rtext = review_elem.get_text(strip=True)
                    digits = ''.join(filter(str.isdigit, rtext))
                    reviews = int(digits) if digits else None
                rating = None
                if rating_elem:
                    try:
                        rating = float(rating_elem.get_text(strip=True).split()[0])
                    except Exception:
                        pass
                rank = None
                if rank_elem:
                    d = ''.join(filter(str.isdigit, rank_elem.get_text(strip=True)))
                    rank = int(d) if d else None
                trend = trend_elem.get_text(strip=True) if trend_elem else None
                page_text = soup.get_text()
                if any(k in page_text for k in OOS_KEYWORDS):
                    msg = f'{name} appears out of stock at {url}'
                    send_slack(msg)
                    log_error(msg)
                save_baseline(url, resp.text)
                return name, price, reviews, rating, rank, trend
            except Exception as e:
                log_error(f'Attempt failed for {url}: {e}')
                if attempt < MAX_RETRIES - 1:
                    time.sleep(1)
                else:
                    break
        switch_proxy()
    raise Exception('All retries failed')


def fetch_task(info):
    url = info['url'] if isinstance(info, dict) else info
    ns = info.get('nameSelector') if isinstance(info, dict) else None
    ps = info.get('priceSelector') if isinstance(info, dict) else None
    rs = info.get('reviewSelector') if isinstance(info, dict) else None
    ratings = info.get('ratingSelector') if isinstance(info, dict) else None
    rk = info.get('rankSelector') if isinstance(info, dict) else None
    ts = info.get('trendSelector') if isinstance(info, dict) else None
    try:
        name, price, reviews, rating, rank, trend = fetch_price(
            url,
            ns or 'span.productTitle',
            ps or 'span.price',
            rs,
            ratings,
            rk,
            ts,
        )
        return {
            'name': name,
            'price': price,
            'reviews': reviews,
            'rating': rating,
            'rank': rank,
            'trend': trend,
            'url': url,
        }
    except Exception as e:
        return {'error': str(e), 'url': url}


def main(csv_key=os.getenv('PRICES_CSV_KEY', 'prices.csv')):
    now = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    rows = []
    if not URLS:
        return
    pool_size = optimal_pool_size(len(URLS))
    tasks = [{'url': u} for u in URLS]
    with Pool(pool_size) as pool:
        results = pool.map(fetch_task, tasks)
    for r in results:
        if r.get('error'):
            msg = f"Error fetching {r['url']}: {r['error']}"
            print(msg)
            send_slack(msg)
            log_error(msg)
        else:
            rows.append({
                'name': r['name'],
                'price': r['price'],
                'reviews': r.get('reviews'),
                'rating': r.get('rating'),
                'rank': r.get('rank'),
                'trend': r.get('trend'),
                'time': now,
            })

    if rows:
        append_csv(
            csv_key,
            rows,
            fieldnames=['name', 'price', 'reviews', 'rating', 'rank', 'trend', 'time'],
        )

if __name__ == '__main__':
    main()