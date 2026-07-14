import requests
import sys
import time
import uuid

# Endpoint and headers
url = 'http://im-services-analytics.core:8080/im-services-analytics/v1/livelihood-summary-email/daily'
headers = {
    'Content-Type': 'application/json'
}

# Base payload template
base_data = {
    "RequestInfo": {
        "apiId": "im-services-analytics",
        "ver": "1.0",
        "ts": None,  # Will be set to current timestamp
        "action": "_create",
        "did": "cronjob-livelihood-daily-summary",
        "key": "cronjob-key",
        "msgId": None,  # Will be set to UUID
        "authToken": "cronjob-token",
        "userInfo": {
            "id": None,
            "uuid": None,  # Will be set to UUID
            "userName": "CRONJOB_LIVELIHOOD_DAILY_SUMMARY",
            "name": "Cron Job - Livelihood Daily Summary",
            "mobileNumber": "0000000000",
            "emailId": "cronjob@livelihood.com",
            "locale": "en_IN",
            "type": "SYSTEM",
            "roles": [],
            "active": True,
            "tenantId": "livelihood"
        },
        "plainAccessRequest": {}
    }
}

base_data["RequestInfo"]["ts"] = int(time.time() * 1000)
base_data["RequestInfo"]["msgId"] = str(uuid.uuid4())
base_data["RequestInfo"]["userInfo"]["uuid"] = str(uuid.uuid4())

try:
    print(f"Calling livelihood daily summary endpoint: {url}")
    response = requests.post(url, headers=headers, json=base_data, timeout=300)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code == 200:
        print("Livelihood daily summary processing completed successfully")
    else:
        print(f"Livelihood daily summary processing returned status {response.status_code}")
        sys.exit(1)

except Exception as e:
    print(f"Error calling livelihood daily summary endpoint: {e}")
    sys.exit(1)
