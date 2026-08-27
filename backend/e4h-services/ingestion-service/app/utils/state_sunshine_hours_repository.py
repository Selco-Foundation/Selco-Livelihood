import os
from typing import Dict

import psycopg2
from dotenv import load_dotenv

from app.core.logging import AppLogger

logger = AppLogger().get_logger()
load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
}

# state_sunshine_hours is owned by rms-service (seeded there for CO2 reporting) and read
# here directly rather than over HTTP: rms-service only exposes it bundled inside
# GET /v1/co2/reference, and duplicating the values into a facility column would let them
# drift from the source table. Same shared-Postgres pattern already used for
# eg_hrms_employee / eg_user / eg_incident_v2 lookups in file_ingestion.py.
_QUERY = "SELECT state, sunshine_hours_per_day FROM state_sunshine_hours WHERE tenant_id = %s"


def fetch_state_sunshine_hours(tenant_id: str = "in") -> Dict[str, float]:
    """Return {state: sunshine_hours_per_day}. Returns {} on any failure so a missing
    table or unreachable DB degrades the Solution dropdown to empty rather than
    failing the whole template download."""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            cursor.execute(_QUERY, (tenant_id,))
            rows = cursor.fetchall()
    except Exception as e:
        logger.error(f"Error reading state_sunshine_hours: {e}", exc_info=True)
        return {}
    finally:
        if conn is not None:
            conn.close()

    result: Dict[str, float] = {}
    for state, hours in rows:
        if state is None or hours is None:
            continue
        result[normalize_state_key(state)] = float(hours)
    return result


def normalize_state_key(state: str) -> str:
    """rms-service stores states as 'India_Karnataka' while a facility's address.state is
    a plain display name like 'Karnataka'. Reduce both to a comparable key."""
    if not state:
        return ""
    key = str(state).strip()
    if "_" in key:
        key = key.rsplit("_", 1)[-1]
    return key.replace(" ", "").replace("-", "").lower()
