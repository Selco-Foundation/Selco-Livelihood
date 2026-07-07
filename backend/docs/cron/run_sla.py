import json
import os
import sys
import time
import uuid

import requests

USER_HOST = "http://localhost:8284"
SLA_URL = "http://localhost:8080/im-services-analytics/v1/computeSLA?transform=false"

DEFAULT_TENANT_IDS = ("livelihood",)


def resolve_tenant_ids() -> list[str]:
    if len(sys.argv) > 1:
        return sys.argv[1:]
    env_tenants = os.environ.get("SLA_TENANT_IDS") or os.environ.get("TENANT_ID")
    if env_tenants:
        return [t.strip() for t in env_tenants.replace(",", " ").split() if t.strip()]
    return list(DEFAULT_TENANT_IDS)


tenant_ids = resolve_tenant_ids()

if not tenant_ids:
    print("Usage: python run_sla.py [tenant_id ...]")
    print(f"Defaults to {', '.join(DEFAULT_TENANT_IDS)} when no tenant is provided.")
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
        print(f"[{tenant_id}] Starting SLA computation...")
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
