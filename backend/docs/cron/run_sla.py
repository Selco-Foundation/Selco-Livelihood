import json
import sys
import time
import uuid

import requests

USER_HOST = "http://egov-user.core:8080"
SLA_URL = "http://im-services-analytics.core:8080/im-services-analytics/v1/computeSLA?transform=false"

tenant_ids = sys.argv[1:]

if not tenant_ids:
    print("Usage: python run_sla.py <tenant_id1> <tenant_id2> ...")
    sys.exit(1)

headers = {"Content-Type": "application/json"}


def fetch_cronjob_user(tenant_id: str) -> dict:
    """Fetch SYSTEM CRONJOB user for the tenant from egov-user."""
    user_url = f"{USER_HOST}/user/v1/_search?tenantId={tenant_id}"
    user_payload = {
        "requestInfo": {
            "apiId": "Rainmaker",
            "ver": ".01",
            "ts": int(time.time() * 1000),
            "action": "POST",
            "msgId": str(uuid.uuid4()),
            "userInfo": {"id": 102},
        },
        "tenantId": tenant_id,
        "userType": "SYSTEM",
        "userName": "CRONJOB",
        "pageSize": "1",
        "roleCodes": ["SYSTEM"],
    }

    response = requests.post(user_url, headers=headers, json=user_payload, timeout=30)
    response.raise_for_status()
    users = response.json().get("user", [])
    if not users:
        raise RuntimeError(f"CRONJOB user not found for tenant: {tenant_id}")
    return users[0]


for tenant_id in tenant_ids:
    try:
        user_info = fetch_cronjob_user(tenant_id)
        user_info["tenantId"] = tenant_id
        if user_info.get("roles"):
            for role in user_info["roles"]:
                role["tenantId"] = tenant_id

        payload = {
            "RequestInfo": {
                "apiId": "Rainmaker",
                "ver": "1.0",
                "ts": int(time.time() * 1000),
                "action": "_update",
                "msgId": f"{int(time.time() * 1000)}|en_IN",
                "userInfo": user_info,
                "plainAccessRequest": {},
            },
            "tenantId": tenant_id,
        }

        response = requests.post(SLA_URL, headers=headers, json=payload, timeout=600)
        print(f"[{tenant_id}] Status: {response.status_code}")
        print(response.text[:500])
    except Exception as e:
        print(f"[{tenant_id}] Error: {e}")
