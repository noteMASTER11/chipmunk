from flask import Flask, request, render_template, jsonify
import requests
import pandas as pd
import time

app = Flask(__name__)

URL = "https://api.hamsterkombat.io/clicker/upgrades-for-buy"
UPGRADE_URL = "https://api.hamsterkombat.io/clicker/buy-upgrade"
DAILY_CIPHER_URL = "https://api.hamsterkombat.io/clicker/claim-daily-cipher"
USER_INFO_URL = "https://api.hamsterkombat.io/auth/me-telegram"
SYNC_URL = "https://api.hamsterkombat.io/clicker/sync"

def get_base_headers(token):
    return {
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7",
        "Authorization": token,
        "Connection": "keep-alive"
    }

def get_headers(token):
    return get_base_headers(token)

def get_efficiency_data(token):
    headers = get_headers(token)
    response = requests.post(URL, headers=headers)
    if response.status_code == 200:
        data = response.json()
        upgrades = data.get("upgradesForBuy", [])

        filtered_upgrades = [item for item in upgrades if
                             not item.get("isExpired", True) and item.get("isAvailable", True) and item.get(
                                 "cooldownSeconds", 0) == 0]
        extracted_data = [(item["id"], item["name"], item["section"], item["price"], item["profitPerHour"], item["profitPerHourDelta"]) for item in
                          filtered_upgrades]
        efficiency_data = []

        for upgrade_id, name, section, price, profitPerHour, profitPerHourDelta in extracted_data:
            try:
                efficiency = (profitPerHour / price) * 100
            except ZeroDivisionError:
                efficiency = 0
            efficiency_data.append((upgrade_id, name, section, efficiency, price, profitPerHourDelta))

        sorted_data = sorted(efficiency_data, key=lambda x: x[3], reverse=True)
        return sorted_data
    else:
        return []

def handle_empty_string(value):
    return value if value else "Not present or hidden by user"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_data', methods=['GET'])
def get_data():
    count = int(request.args.get('count', 25))
    token = request.args.get('token')
    data = get_efficiency_data(token)[:count]
    return jsonify(data)

@app.route('/upgrade', methods=['POST'])
def upgrade():
    data = request.json
    upgrade_id = data.get('upgradeId')
    token = data.get('token')
    headers = get_headers(token)
    UPGRADE_DATA = {
        "upgradeId": upgrade_id,
        "timestamp": int(time.time() * 1000)
    }
    response = requests.post(UPGRADE_URL, headers=headers, json=UPGRADE_DATA)
    if response.status_code == 200:
        return jsonify({"status": "success"})
    else:
        try:
            error_json = response.json()
            error_message = error_json.get("error_message", "Unknown error")
        except ValueError:
            error_message = response.content.decode("utf-8")
        return jsonify({"status": "error", "error": error_message}), response.status_code

@app.route('/validate_cipher', methods=['POST'])
def validate_cipher():
    data = request.json
    cipher = data.get('cipher')
    token = data.get('token')
    headers = get_headers(token)
    DATA = {
        "cipher": cipher
    }
    response = requests.post(DAILY_CIPHER_URL, headers=headers, json=DATA)
    if response.status_code == 200:
        return jsonify({"status": "success"})
    else:
        try:
            error_json = response.json()
            error_message = error_json.get("error_message", "Unknown error")
        except ValueError:
            error_message = response.content.decode("utf-8")
        return jsonify({"status": "error", "error": error_message}), response.status_code

@app.route('/get_user_info', methods=['POST'])
def get_user_info():
    data = request.json
    token = data.get('token')
    headers = get_headers(token)
    response = requests.post(USER_INFO_URL, headers=headers)
    if response.status_code == 200:
        user_data = response.json().get("telegramUser", {})
        return jsonify({
            "user_id": handle_empty_string(user_data.get("id", "N/A")),
            "bot": handle_empty_string(user_data.get("isBot", "N/A")),
            "first_name": handle_empty_string(user_data.get("firstName", "N/A")),
            "last_name": handle_empty_string(user_data.get("lastName", "N/A")),
            "telegram_username": handle_empty_string(user_data.get("username", "N/A")),
            "language": handle_empty_string(user_data.get("languageCode", "N/A"))
        })
    else:
        try:
            error_json = response.json()
            error_message = error_json.get("error_message", "Unknown error")
        except ValueError:
            error_message = response.content.decode("utf-8")
        return jsonify({"status": "error", "error": error_message}), response.status_code

@app.route('/get_balance_info', methods=['POST'])
def get_balance_info():
    data = request.json
    token = data.get('token')
    headers = get_headers(token)
    response = requests.post(SYNC_URL, headers=headers)
    if response.status_code == 200:
        balance_data = response.json().get("clickerUser", {})
        earn_per_sec = balance_data.get("earnPassivePerSec", 0)
        earn_per_hour = balance_data.get("earnPassivePerHour", 0)
        return jsonify({
            "balance": int(balance_data.get("balanceCoins", 0)),
            "taps": balance_data.get("availableTaps", 0),
            "last_update": balance_data.get("lastSyncUpdate", "N/A"),
            "exchange": balance_data.get("exchangeId", "N/A"),
            "earn_per_sec": earn_per_sec,
            "earn_per_hour": earn_per_hour,
            "earn_per_day": earn_per_hour * 24,
            "earn_per_week": earn_per_hour * 24 * 7,
            "last_passive_earn": balance_data.get("lastPassiveEarn", 0)
        })
    else:
        try:
            error_json = response.json()
            error_message = error_json.get("error_message", "Unknown error")
        except ValueError:
            error_message = response.content.decode("utf-8")
        return jsonify({"status": "error", "error": error_message}), response.status_code

if __name__ == '__main__':
    app.run(debug=True)
