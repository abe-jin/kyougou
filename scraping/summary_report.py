import os
import pandas as pd
import matplotlib.pyplot as plt
from io import BytesIO
from matplotlib.backends.backend_pdf import PdfPages
from datetime import timedelta
import argparse
import smtplib
from email.message import EmailMessage

from env_loader import load_env
from s3_utils import download_csv, download_json

load_env()
from backup import auto_backup
auto_backup()

SMTP_SERVER = os.getenv('SMTP_SERVER', 'localhost')
SMTP_PORT = int(os.getenv('SMTP_PORT', '465'))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
EMAIL_TO = os.getenv('REPORT_EMAIL_TO')
PRICES_CSV_KEY = os.getenv('PRICES_CSV_KEY', 'prices.csv')
PRODUCTS_KEY = os.getenv('PRODUCTS_KEY', 'frontend/products.json')
TIMEZONE = os.getenv('TIMEZONE', 'UTC')
SUMMARY_REPORT_SUBJECT = os.getenv('SUMMARY_REPORT_SUBJECT', 'Price Summary Report')
SUMMARY_REPORT_BODY = os.getenv('SUMMARY_REPORT_BODY', 'Price summary report attached.')
SUMMARY_REPORT_FORMAT = os.getenv('SUMMARY_REPORT_FORMAT', 'excel')


def create_excel_report(period: str = 'month', category: str | None = None, output_path: str = 'summary_report.xlsx'):
    rows = download_csv(PRICES_CSV_KEY)
    if not rows:
        return None
    df = pd.DataFrame(rows)
    df['time'] = pd.to_datetime(df['time'], utc=True).dt.tz_convert(TIMEZONE)

    if period == 'year':
        start = df['time'].max() - timedelta(days=365)
    else:
        start = df['time'].max() - timedelta(days=30)
    df = df[df['time'] >= start]

    if period == 'category':
        prods = download_json(PRODUCTS_KEY, [])
        cats = {p['name']: p.get('category', 'Uncategorized') for p in prods}
        df['category'] = df['name'].map(cats)
        group_key = 'category'
    else:
        group_key = 'name'

    writer = pd.ExcelWriter(output_path, engine='xlsxwriter')
    for key, g in df.groupby(group_key):
        if category and key != category:
            continue
        g = g.sort_values('time')
        sheet = str(key)[:31]
        g_display = g.copy()
        g_display['time'] = g_display['time'].dt.strftime('%Y-%m-%d %H:%M')
        g_display.to_excel(writer, sheet_name=sheet, index=False)
        min_p = g['price'].min()
        max_p = g['price'].max()
        mean_p = g['price'].mean()
        ws = writer.sheets[sheet]
        stats_row = len(g) + 2
        ws.write(stats_row, 0, 'Min')
        ws.write(stats_row, 1, min_p)
        ws.write(stats_row + 1, 0, 'Max')
        ws.write(stats_row + 1, 1, max_p)
        ws.write(stats_row + 2, 0, 'Mean')
        ws.write(stats_row + 2, 1, mean_p)
        plt.figure(figsize=(6, 4))
        plt.plot(g['time'].dt.strftime('%Y-%m-%d'), g['price'], marker='o')
        plt.title(str(key))
        plt.tight_layout()
        img = BytesIO()
        plt.savefig(img, format='png')
        plt.close()
        img.seek(0)
        ws.insert_image(0, 4, f'{key}.png', {'image_data': img})
    writer.close()
    return output_path


def create_pdf_report(period: str = 'month', category: str | None = None, output_path: str = 'summary_report.pdf'):
    rows = download_csv(PRICES_CSV_KEY)
    if not rows:
        return None
    df = pd.DataFrame(rows)
    df['time'] = pd.to_datetime(df['time'], utc=True).dt.tz_convert(TIMEZONE)

    if period == 'year':
        start = df['time'].max() - timedelta(days=365)
    else:
        start = df['time'].max() - timedelta(days=30)
    df = df[df['time'] >= start]

    if period == 'category':
        prods = download_json(PRODUCTS_KEY, [])
        cats = {p['name']: p.get('category', 'Uncategorized') for p in prods}
        df['category'] = df['name'].map(cats)
        group_key = 'category'
    else:
        group_key = 'name'

    with PdfPages(output_path) as pdf:
        for key, g in df.groupby(group_key):
            if category and key != category:
                continue
            g = g.sort_values('time')
            plt.figure(figsize=(6, 4))
            plt.plot(g['time'].dt.strftime('%Y-%m-%d'), g['price'], marker='o')
            plt.title(str(key))
            min_p = g['price'].min()
            max_p = g['price'].max()
            mean_p = g['price'].mean()
            plt.figtext(0.15, 0.8, f'Min: {min_p}\nMax: {max_p}\nMean: {mean_p}')
            plt.tight_layout()
            pdf.savefig()
            plt.close()
    return output_path


def send_email(path: str, recipient: str = EMAIL_TO):
    """Send the summary report to one or more recipients."""
    if not recipient:
        return
    recipients = [r.strip() for r in str(recipient).split(',') if r.strip()]
    msg = EmailMessage()
    msg['Subject'] = SUMMARY_REPORT_SUBJECT
    msg['From'] = SMTP_USER or 'noreply@example.com'
    msg['To'] = ', '.join(recipients)
    msg.set_content(SUMMARY_REPORT_BODY)
    with open(path, 'rb') as f:
        data = f.read()
    if path.endswith('.pdf'):
        maintype, subtype = 'application', 'pdf'
    else:
        maintype = 'application'
        subtype = 'vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=os.path.basename(path))
    with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
        if SMTP_USER:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--period', choices=['month', 'year', 'category'], default='month')
    parser.add_argument('--category', help='category name when period=category')
    args = parser.parse_args()
    if SUMMARY_REPORT_FORMAT.lower() == 'pdf':
        out = create_pdf_report(args.period, args.category)
    else:
        out = create_excel_report(args.period, args.category)
    if out:
        send_email(out)


if __name__ == '__main__':
    main()