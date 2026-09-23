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


_COUNTRY_SEGMENTS = {"india", "in"}


def normalize_state_key(state: str) -> str:
    """Reduce the several spellings of a state name to one comparable key.

    The same state reaches us as 'India_Karnataka' (rms-service), 'Karnataka' (a localized
    boundary name) or 'BOUNDARY_INDIA_KARNATAKA' (that name's fallback when localization is
    unavailable). Strip the localization prefix and the leading country segment, then drop
    separators -- splitting on the *last* underscore instead would turn
    'BOUNDARY_INDIA_TAMIL_NADU' into 'nadu' and never match 'India_Tamil Nadu'.
    """
    if not state:
        return ""
    key = str(state).strip()
    if key.upper().startswith("BOUNDARY_"):
        key = key[len("BOUNDARY_"):]
    segments = key.split("_")
    if len(segments) > 1 and segments[0].strip().lower() in _COUNTRY_SEGMENTS:
        segments = segments[1:]
    return "".join(segments).replace(" ", "").replace("-", "").lower()
