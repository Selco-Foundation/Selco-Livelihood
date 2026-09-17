import logging
from typing import Any, Dict

import requests

logger = logging.getLogger(__name__)


class AssetServiceClient:
    def __init__(self, asset_service_url: str):
        self.asset_service_url = asset_service_url

    def create_asset(self, asset_payload: Dict[str, Any]):
        """Create a single asset via asset-registry. Bulk _create is not implemented server-side,
        so ingestion loops single creates (one row -> one call)."""
        url = f"{self.asset_service_url}/asset-registry/v1/asset/_create"
        headers = {"Content-Type": "application/json"}
        try:
            response = requests.post(url, headers=headers, json=asset_payload, timeout=30)
            return response
        except requests.exceptions.ConnectionError as conn_err:
            logger.error(f"Connection error occurred: {conn_err}")
            raise conn_err
        except requests.exceptions.Timeout as timeout_err:
            logger.error(f"Timeout error occurred: {timeout_err}")
            raise timeout_err
        except requests.exceptions.RequestException as req_err:
            logger.error(f"An error occurred: {req_err}")
            raise req_err

    def search_assets_by_facility(self, request_info, tenant_id: str, facility_id: str) -> Dict[str, Any]:
        """Search assets for a facility (used to verify created rows)."""
        url = f"{self.asset_service_url}/asset-registry/v1/asset/_search"
        headers = {"Content-Type": "application/json"}
        payload = {
            "RequestInfo": request_info.model_dump(by_alias=True, exclude_none=True),
            "criteria": {"tenantId": tenant_id, "facilityID": facility_id},
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Asset search error: {req_err}")
            raise req_err
