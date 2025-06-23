import os
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from env_loader import load_env
from s3_utils import download_csv
from notify import send_slack, send_line

load_env()
from backup import auto_backup
auto_backup()

CSV_KEY = os.getenv('PRICES_CSV_KEY', 'prices.csv')
THRESHOLD = float(os.getenv('TREND_ALERT_THRESHOLD', '0.1'))  # 10% deviation


def load_history(csv_key=CSV_KEY):
    rows = download_csv(csv_key)
    if not rows:
        return pd.DataFrame(columns=['name', 'price', 'time'])
    df = pd.DataFrame(rows)
    df['price'] = df['price'].astype(float)
    df['time'] = pd.to_datetime(df['time'])
    return df


def check_product(name, prices):
    if len(prices) < 3:
        return
    prices = prices[-20:]  # last 20 records
    idx = np.arange(len(prices)).reshape(-1, 1)
    model = LinearRegression()
    model.fit(idx, prices)
    pred = model.predict([[len(prices)]])[0]
    last_price = prices[-1]
    prev_price = prices[-2]
    diff_pred = abs(last_price - pred) / pred
    diff_prev = abs(last_price - prev_price) / prev_price
    if diff_pred > THRESHOLD or diff_prev > THRESHOLD:
        msg = f'{name} price anomaly: last {last_price}, predicted {pred:.1f}'
        send_slack(msg)
        send_line(msg)


if __name__ == '__main__':
    df = load_history()
    if df.empty:
        exit()

    for name, g in df.groupby('name'):
        prices = g.sort_values('time')['price'].values
        check_product(name, prices)