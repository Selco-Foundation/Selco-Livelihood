import os

# Canonical tenant for all Livelihood ingestion API calls (boundary, facility, asset,
# vendor, MDMS, HRMS, localization, etc.). Override via env for other environments.
LIVELIHOOD_TENANT_ID = os.getenv("LIVELIHOOD_TENANT_ID", "livelihood")

# egov-localization module for Livelihood boundary labels and related messages.
LOCALIZATION_MODULE = os.getenv("LIVELIHOOD_LOCALIZATION_MODULE", "rainmaker-livelihood")
