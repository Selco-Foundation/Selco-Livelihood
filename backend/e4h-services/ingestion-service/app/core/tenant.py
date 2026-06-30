import os

# Canonical tenant for all Livelihood ingestion API calls (boundary, facility, asset,
# vendor, MDMS, HRMS, localization, etc.). Override via env for other environments.
LIVELIHOOD_TENANT_ID = os.getenv("LIVELIHOOD_TENANT_ID", "livelihood")
