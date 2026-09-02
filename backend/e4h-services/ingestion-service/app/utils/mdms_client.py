from typing import List, Dict, Any, Optional

import requests

from app.core.tenant import LIVELIHOOD_TENANT_ID
from app.schemas.request_info import RequestInfo
from app.schemas.vendor_ingestion_shema_response import IngestionSchemaResponse, MDMS, MDMSDataSource


def get_nested_value(data: Dict[str, Any], path: str) -> Any:
    """Resolve a dotted path (optionally prefixed with '$.') against a dict."""
    if not path:
        return ""
    normalized = path[2:] if path.startswith("$.") else path
    cur: Any = data
    for part in normalized.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return ""
    return "" if cur is None else cur


# Some live MDMS schema definitions lock mdmsSource down to exactly
# {path, master, module, filterType} (additionalProperties: false), so mode/
# displayField/nestedField can't always be stored as real properties. When
# they're absent, fall back to a convention encoded in the existing fields:
# filterType carries the mode (DIRECT_ONE_OF | NESTED_ONE_OF, else "resolve"),
# and a nested master's array field is its name with a trailing "Schema"
# stripped (e.g. master "SystemSchema" -> data.System[]).
_FILTER_TYPE_MODE_MAP = {"DIRECT_ONE_OF": "direct", "NESTED_ONE_OF": "nested"}


def resolve_mdms_dropdown_values(
    mdms_source: Optional[MDMSDataSource], raw_records: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Turn raw MDMS records into deduplicated [{"display":, "value":}, ...] dropdown
    options, honoring mdmsSource.mode ('resolve' default | 'direct' | 'nested')."""
    if not raw_records:
        return []

    mode = (mdms_source.mode if mdms_source else None) or _FILTER_TYPE_MODE_MAP.get(
        mdms_source.filterType if mdms_source else None, "resolve"
    )
    display_field = (mdms_source.displayField if mdms_source else None) or "name"
    path = mdms_source.path if mdms_source else None

    records = raw_records
    if mode == "nested":
        master = mdms_source.master if mdms_source else None
        nested_field = (mdms_source.nestedField if mdms_source else None) or (
            master[: -len("Schema")] if master and master.endswith("Schema") else master
        )
        flattened: List[Dict[str, Any]] = []
        for record in raw_records:
            items = record.get(nested_field) if nested_field else None
            if isinstance(items, list):
                flattened.extend(item for item in items if isinstance(item, dict))
        records = flattened
        mode = "resolve"  # the nested array's items are plain {code, name, ...} records

    options: List[Dict[str, Any]] = []
    seen = set()
    for record in records:
        if mode == "direct":
            value = get_nested_value(record, path or "code")
            display = value
        else:
            display = record.get(display_field)
            value = get_nested_value(record, path or "code")

        if display in (None, "") or value in (None, ""):
            continue
        key = (display, value)
        if key in seen:
            continue
        seen.add(key)
        options.append({"display": display, "value": value})

    return options


class MDMSClient:
    def __init__(self, mdms_url: str):
        self.mdms_url = mdms_url

    @staticmethod
    def _is_active_mdms_entry(mdms: MDMS) -> bool:
        if mdms.data is None:
            return True
        data = mdms.data.model_dump()
        if "active" in data:
            return data["active"] is True
        return True

    def fetch_schema(self, request_info: RequestInfo, schema_code: str) -> 'IngestionSchemaResponse':
        url = f"{self.mdms_url}/egov-mdms-service/v2/_search"
        payload = {
            "RequestInfo": {"authToken": request_info.auth_token},
            "MdmsCriteria": {
                "tenantId": LIVELIHOOD_TENANT_ID,
                "schemaCode": schema_code
            }
        }
        headers = {
            "Accept": "application/json, text/plain, */*",
        }
        response = requests.post(url, headers=headers, json=payload)
        # return convert_json_to_object(response.text)
        return IngestionSchemaResponse.model_validate(response.json())

    # Optionally, keep convenience methods for clarity
    def fetch_vendor_schema(self, request_info: RequestInfo) -> 'IngestionSchemaResponse':
        return self.fetch_schema(request_info, "data-ingestion.VendorIngestionSchema")

    def fetch_facility_schema(self, request_info: RequestInfo) -> 'IngestionSchemaResponse':
        return self.fetch_schema(request_info, "data-ingestion.FacilityIngestionSchema")

    def fetch_boundary_schema(self, request_info: RequestInfo) -> 'IngestionSchemaResponse':
        return self.fetch_schema(request_info, "data-ingestion.BoundaryIngestionSchema")

    def fetch_facility_selection_schema(self, request_info: RequestInfo) -> 'IngestionSchemaResponse':
        return self.fetch_schema(request_info, "data-ingestion.FacilitySelectionSchema")

    def fetch_installation_solutions(self, request_info: RequestInfo) -> List[Dict[str, Any]]:
        """Fetch every active Installation.Solution row as a plain dict
        ({code, name, sectorName, sunshineHrsMin, sunshineHrsMax}). MDMSData allows extra
        fields, so these come through even though they aren't declared on the
        ingestion-schema-shaped MDMSData model."""
        response = self.fetch_schema_column_definitions(request_info, "Installation.Solution")
        if not response.mdms:
            return []
        return [mdms.data.model_dump() for mdms in response.mdms if mdms.data]

    def fetch_schema_column_definitions(self, request_info: RequestInfo, schema_code: str) -> IngestionSchemaResponse:
        url = f"{self.mdms_url}/egov-mdms-service/v2/_search"
        payload = {
            "RequestInfo": {"authToken": request_info.auth_token},
            "MdmsCriteria": {
                "tenantId": LIVELIHOOD_TENANT_ID,
                "schemaCode": schema_code
            }
        }
        headers = {"Accept": "application/json, text/plain, */*"}
        response = requests.post(url, headers=headers, json=payload)
        parsed = IngestionSchemaResponse.model_validate(response.json())
        if parsed.mdms:
            parsed.mdms = [mdms for mdms in parsed.mdms if self._is_active_mdms_entry(mdms)]
        return parsed

    def get_column_definitions_with_metadata(self, request_info: RequestInfo, schema_code: str) -> List[Dict[str, Any]]:
        response = self.fetch_schema_column_definitions(request_info, schema_code)

        if not response.mdms or not response.mdms[0].data:
            return []

        result = []
        columns = response.mdms[0].data.columns or []

        for col in columns:
            column_info = {
                "name": col.name,
                "type": col.type,
                "required": col.required,
                "pattern": col.pattern,
                "mdms_values": [],
                "mdms_options": [],
                "code": col.code
            }

            if col.mdmsSource:
                dependent_schema_code = f"{col.mdmsSource.module}.{col.mdmsSource.master}"
                mdms_response = self.fetch_schema_column_definitions(request_info, dependent_schema_code)
                if mdms_response.mdms:
                    column_info["mdms_values"] = [mdms.data.model_dump() for mdms in mdms_response.mdms if mdms.data]
                    column_info["mdms_options"] = resolve_mdms_dropdown_values(col.mdmsSource, column_info["mdms_values"])

            result.append(column_info)

        return result


    def get_column_definitions_and_row_constraints_with_metadata(self, request_info: RequestInfo, schema_code: str) -> Dict[str, Any]:
        response = self.fetch_schema_column_definitions(request_info, schema_code)

        if not response.mdms or not response.mdms[0].data:
            return {}

        result = {}
        columns = response.mdms[0].data.columns or []
        row_constraints = response.mdms[0].data.rowConstraints or []
        result["row_constraints"] = row_constraints
        column_list = []

        for col in columns:
            column_info = {
                "name": col.name,
                "type": col.type,
                "required": col.required,
                "pattern": col.pattern,
                "mdms_values": [],
                "mdms_options": [],
                "code": col.code
            }

            if col.mdmsSource:
                dependent_schema_code = f"{col.mdmsSource.module}.{col.mdmsSource.master}"
                mdms_response = self.fetch_schema_column_definitions(request_info, dependent_schema_code)
                if mdms_response.mdms:
                    column_info["mdms_values"] = [mdms.data.model_dump() for mdms in mdms_response.mdms if mdms.data]
                    column_info["mdms_options"] = resolve_mdms_dropdown_values(col.mdmsSource, column_info["mdms_values"])

            column_list.append(column_info)
        result["column_list"] = column_list
        return result

    def get_tenant_mapping(self, request_info: RequestInfo, tenant_ids: List[str]) -> Dict:
        all_tenant_data = {}

        for tenant_id in tenant_ids:
            search_url = f"{self.mdms_url}/egov-mdms-service/v1/_search"
            search_payload = {
                "RequestInfo": request_info.model_dump(by_alias=True, exclude_none=True),
                "MdmsCriteria": {
                    "tenantId": tenant_id,
                    "moduleDetails": [
                        {
                            "moduleName": "tenant",
                            "masterDetails": [
                                {
                                    "name": "tenants"
                                }
                            ]
                        }
                    ]
                }
            }
            response = requests.post(search_url, json=search_payload)
            if response.status_code in [200, 201, 202]:
                data = response.json()
                tenants = data.get("MdmsRes", {}).get("tenant", {}).get("tenants", [])
                all_tenant_data.update(
                    {t["code"]: t for t in tenants if t.get("code") and t["code"] not in all_tenant_data})

        return all_tenant_data