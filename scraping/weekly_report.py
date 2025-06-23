import os
import pandas as pd
import matplotlib.pyplot as plt
from io import BytesIO
from datetime import timedelta
import smtplib
from email.message import EmailMessage
from matplotlib.backends.backend_pdf import PdfPages

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
USERS_KEY = os.getenv('USERS_JSON_KEY', 'users.json')
TIMEZONE = os.getenv('TIMEZONE')
WEEKLY_REPORT_SUBJECT = os.getenv('WEEKLY_REPORT_SUBJECT', 'Weekly Price Report')
WEEKLY_REPORT_BODY = os.getenv('WEEKLY_REPORT_BODY', 'Weekly price report attached.')
WEEKLY_REPORT_FORMAT = os.getenv('WEEKLY_REPORT_FORMAT', 'excel')

if not TIMEZONE and EMAIL_TO:
    users = download_json(USERS_KEY, [])
    user = next((u for u in users if u.get('email') == EMAIL_TO), {})
    TIMEZONE = user.get('tz', 'UTC')
TIMEZONE = TIMEZONE or 'UTC'


def create_excel_report(csv_key=os.getenv('PRICES_CSV_KEY', 'prices.csv'), output_path='weekly_report.xlsx'):
    rows = download_csv(csv_key)
    if not rows:
        return None
    df = pd.DataFrame(rows)
    df['time'] = pd.to_datetime(df['time'], utc=True).dt.tz_convert(TIMEZONE)
    if df.empty:
        return None
    start = df['time'].max() - timedelta(days=7)
    df = df[df['time'] >= start]
    writer = pd.ExcelWriter(output_path, engine='xlsxwriter')
    workbook = writer.book
    for name, g in df.groupby('name'):
        g = g.sort_values('time')
        g_display = g.copy()
        g_display['time'] = g_display['time'].dt.strftime('%Y-%m-%d %H:%M:%S')
        sheet = name[:31]
        g_display.to_excel(writer, sheet_name=sheet, index=False, startrow=0)
        min_p = g['price'].min()
        max_p = g['price'].max()
        mean_p = g['price'].mean()
        worksheet = writer.sheets[sheet]
        stats_row = len(g) + 2
        worksheet.write(stats_row, 0, 'Min')
        worksheet.write(stats_row, 1, min_p)
        worksheet.write(stats_row + 1, 0, 'Max')
        worksheet.write(stats_row + 1, 1, max_p)
        worksheet.write(stats_row + 2, 0, 'Mean')
        worksheet.write(stats_row + 2, 1, mean_p)
        plt.figure(figsize=(6, 4))
        plt.plot(g['time'].dt.tz_convert(TIMEZONE).dt.strftime('%Y-%m-%d %H:%M:%S'), g['price'], marker='o')
        plt.title(name)
        plt.xlabel('Time')
        plt.ylabel('Price')
        plt.tight_layout()
        img = BytesIO()
        plt.savefig(img, format='png')
        plt.close()
        img.seek(0)
        worksheet.insert_image(0, 4, f'{name}.png', {'image_data': img})
    writer.close()
    return output_path


def create_pdf_report(csv_key=os.getenv('PRICES_CSV_KEY', 'prices.csv'), output_path='weekly_report.pdf'):
    rows = download_csv(csv_key)
    if not rows:
        return None
    df = pd.DataFrame(rows)
    df['time'] = pd.to_datetime(df['time'], utc=True).dt.tz_convert(TIMEZONE)
    if df.empty:
        return None
    start = df['time'].max() - timedelta(days=7)
    df = df[df['time'] >= start]
    with PdfPages(output_path) as pdf:
        for name, g in df.groupby('name'):
            g = g.sort_values('time')
            plt.figure(figsize=(6, 4))
            plt.plot(g['time'].dt.strftime('%Y-%m-%d %H:%M'), g['price'], marker='o')
            plt.title(name)
            plt.xlabel('Time')
            plt.ylabel('Price')
            min_p = g['price'].min()
            max_p = g['price'].max()
            mean_p = g['price'].mean()
            plt.figtext(0.15, 0.8, f'Min: {min_p}\nMax: {max_p}\nMean: {mean_p}')
            plt.tight_layout()
            pdf.savefig()
            plt.close()
    return output_path


def send_email(attachment_path, recipient=EMAIL_TO):
    """Email the generated report to one or more recipients."""
    if not recipient:
        return
    recipients = [r.strip() for r in str(recipient).split(',') if r.strip()]
    msg = EmailMessage()
    msg['Subject'] = WEEKLY_REPORT_SUBJECT
    msg['From'] = SMTP_USER or 'noreply@example.com'
    msg['To'] = ', '.join(recipients)
    msg.set_content(WEEKLY_REPORT_BODY)
    with open(attachment_path, 'rb') as f:
        data = f.read()
    if attachment_path.endswith('.pdf'):
        maintype, subtype = 'application', 'pdf'
    else:
        maintype = 'application'
        subtype = 'vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=os.path.basename(attachment_path))
    with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
        if SMTP_USER:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)


def main():
    if WEEKLY_REPORT_FORMAT.lower() == 'pdf':
        report = create_pdf_report()
    else:
        report = create_excel_report()
    if report:
        send_email(report)


if __name__ == '__main__':
    main()