import logging
from typing import Dict, List

import requests

from app.schemas.request_info import RequestInfo

logger = logging.getLogger(__name__)


class VendorRegistryClient:
    def __init__(self, vendor_service_url: str):
        self.vendor_service_url = vendor_service_url

    def get_all_vendor_codes(self, request_info: RequestInfo) -> List[Dict]:
        """One row per vendor user across all livelihood orgs.
        Vendor Id = user UUID (stored as asset.vendorId for direct ticket assignment).
        Vendor Code = username (what the ingestion person types in the template)."""
        orgs = self._fetch_all_orgs(request_info)
        if not orgs:
            return []

        request_info_dict = request_info.model_dump(by_alias=True, exclude_none=True)
        headers = {"Content-Type": "application/json"}
        rows = []

        for org in orgs:
            org_id = org.get("id", "")
            app_number = org.get("applicationNumber", "")
            if not org_id:
                continue
            try:
                url = (
                    f"{self.vendor_service_url}/vendor/organisation/v1/user/_search"
                    f"?tenantId=livelihood&limit=1000&offset=0"
                )
                payload = {
                    "RequestInfo": request_info_dict,
                    "OrgUser": {"tenantId": "livelihood", "organizationIds": [org_id]},
                }
                response = requests.post(url, headers=headers, json=payload, timeout=60)
                response.raise_for_status()
                for org_user in response.json().get("OrgUsers") or []:
                    if org_user.get("isDeleted"):
                        continue
                    user = org_user.get("user") or {}
                    user_uuid = org_user.get("userId") or user.get("uuid", "")
                    username = user.get("userName", "")
                    if not username or not user_uuid:
                        continue
                    rows.append({
                        "Vendor Id": user_uuid,
                        "Vendor Code": username,
                        "Vendor Name": user.get("name", ""),
                        "Vendor Application Number": app_number,
                    })
            except Exception as e:
                logger.error(f"Error fetching users for org {org_id}: {e}")

        return rows

    def get_vendor_code_lookup(self, request_info: RequestInfo) -> Dict[str, str]:
        """Map of {username: user UUID} for resolving asset.vendorId at create time."""
        return {
            v["Vendor Code"]: v["Vendor Id"]
            for v in self.get_all_vendor_codes(request_info)
            if v.get("Vendor Code") and v.get("Vendor Id")
        }

    def _fetch_all_orgs(self, request_info: RequestInfo) -> List[Dict]:
        url = f"{self.vendor_service_url}/vendor/organisation/v1/_search"
        payload = {
            "RequestInfo": request_info.model_dump(by_alias=True, exclude_none=True),
            "SearchCriteria": {"tenantId": "livelihood", "createdFrom": 0},
            "Pagination": {"limit": 10000, "offset": 0},
        }
        try:
            response = requests.post(
                url, headers={"Content-Type": "application/json"}, json=payload, timeout=60
            )
            response.raise_for_status()
            return response.json().get("organisations") or []
        except Exception as e:
            logger.error(f"Error fetching vendor orgs: {e}")
            return []
