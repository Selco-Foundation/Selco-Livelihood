import datetime
import json
import time
from typing import Dict, Any, Optional, List, Union
from datetime import datetime

import pandas as pd
from pandas import Series
from psycopg.types import none
from pydantic import ValidationError
from sqlalchemy import false, true

from app.core.logging import AppLogger
from app.core.tenant import LIVELIHOOD_TENANT_ID, LOCALIZATION_MODULE
from app.schemas.boundary import Boundary
from app.schemas.request_info import RequestInfo
from app.schemas.vendor import Vendor
from app.schemas.vendor_ingestion_shema_response import (
    MDMS, IngestionSchemaResponse, MDMSAuditDetails, MDMSColumn, MDMSData,
    MDMSDataSource, ResponseInfo)

from app.utils.facility_validator import format_col_name
from app.utils.mdms_client import get_nested_value

logger = AppLogger().get_logger()


def format_facility_data_for_template(
    facility_data: List[Dict[str, Any]],
    facility_schema: List[Dict[str, Any]],
    headers: List[str],
    type: str = None,
    boundary_list: Optional[List[Boundary]] = None,
    boundary_localization_map: Optional[Dict[str, str]] = None,
) -> List[Dict[str, Any]]:
    """
    Converts raw facility data into rows, aligned with `headers`
    (already computed from facility_schema in generate_template_file).
    """

    compiled_cols = []
    for col, header in zip(facility_schema, headers):
        mdms_values = col.get("mdms_values") or []
        code_to_name = {mv.get("code"): mv.get("name") for mv in mdms_values if mv.get("code")}
        compiled_cols.append({
            "header": header,
            "path": col.get("code", ""),
            "type": (col.get("type") or "").strip().lower(),
            "code_to_name": code_to_name,
        })

    boundary_list = boundary_list or []
    boundary_localization_map = boundary_localization_map or {}

    formatted_rows: List[Dict[str, Any]] = []
    if type and type == "project":
        for facility in facility_data:
            facility_boundary_code = facility.get("boundary_code") or facility.get("boundaryCode") or ""
            state_name, district_name, block_name = resolve_boundary_names_for_code(
                facility_boundary_code, boundary_list, boundary_localization_map
            )
            row = {}
            for c in compiled_cols:
                if c["path"] == "state":
                    val = state_name
                elif c["path"] == "district":
                    val = district_name
                elif c["path"] == "block":
                    val = block_name
                else:
                    val = get_nested_value(facility, c["path"])
                    if c["code_to_name"] and isinstance(val, str):
                        val = c["code_to_name"].get(val, val)

                    if c["type"] in ("enum-yes-no", "boolean"):
                        if isinstance(val, bool):
                            val = "Yes" if val else "No"
                        elif isinstance(val, str):
                            val = "Yes" if val.strip().lower() in ("true", "yes", "1") else "No"
                        else:
                            val = ""
                row[c["header"]] = val

            # Add "Include in Project" column value (find the actual column name)
            include_column_name = None
            for header in headers:
                if "Include in Project" in header:
                    include_column_name = header
                    break

            if include_column_name:
                include_value = facility.get("include_in_project", "No")
                row[include_column_name] = include_value
                # Debug logging
                facility_id = facility.get("facility_id", "unknown")
                logger.debug(
                    f"Facility {facility_id} - include_in_project field: {facility.get('include_in_project', 'NOT_SET')} -> setting to: {include_value} in column: {include_column_name}")

            formatted_rows.append(row)

    elif type == "fieldplan":
        for facility in facility_data:
            facility_boundary_code = facility.get("boundary_code") or facility.get("boundaryCode") or ""
            state_name, district_name, block_name = resolve_boundary_names_for_code(
                facility_boundary_code, boundary_list, boundary_localization_map
            )
            row = {}
            for c in compiled_cols:
                if c["path"] == "state":
                    val = state_name
                elif c["path"] == "district":
                    val = district_name
                elif c["path"] == "block":
                    val = block_name
                else:
                    val = get_nested_value(facility, c["path"])
                    if c["code_to_name"] and isinstance(val, str):
                        val = c["code_to_name"].get(val, val)

                    if c["type"] in ("enum-yes-no", "boolean"):
                        if isinstance(val, bool):
                            val = "Yes" if val else "No"
                        elif isinstance(val, str):
                            val = "Yes" if val.strip().lower() in ("true", "yes", "1") else "No"
                        else:
                            val = ""
                row[c["header"]] = val

            # Add "Include in Project" column value (find the actual column name)
            include_column_name = None
            for header in headers:
                if "Included in Field Plan" in header:
                    include_column_name = header
                    break

            if include_column_name:
                include_value = facility.get("include_in_fieldplan", "No")
                row[include_column_name] = include_value
                # Debug logging
                facility_id = facility.get("facility_id", "unknown")
                logger.debug(
                    f"Facility {facility_id} - include_in_fieldplan field: {facility.get('include_in_fieldplan', 'NOT_SET')} -> setting to: {include_value} in column: {include_column_name}")

            formatted_rows.append(row)


    return formatted_rows


def request_info_from_json(request_info_input: Union[str, Dict[str, Any]]) -> RequestInfo:
    """
    Accepts either a JSON string or a dictionary and constructs a RequestInfo object using pydantic.
    """
    try:
        if isinstance(request_info_input, str):
            data: Dict[str, Any] = json.loads(request_info_input)
        elif isinstance(request_info_input, dict):
            data = request_info_input
        else:
            raise TypeError(f"Invalid type for request_info: {type(request_info_input)}")

        return RequestInfo(**data)

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON string in request_info_from_json: {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Pydantic model creation failed in request_info_from_json: {e}", exc_info=True)
        raise


def convert_json_to_object(json_str: str) -> Optional[IngestionSchemaResponse]:
    """
    Converts a JSON string to a IngestionSchemaResponse object,
    handling nested objects.

    Args:
        json_str: The JSON string to convert.

    Returns:
        A IngestionSchemaResponse object if the conversion is successful,
        None otherwise.
    """
    try:
        data: Dict[str, Any] = json.loads(json_str)

        # Extract ResponseInfo
        response_info_data = None
        if 'ResponseInfo' in data and isinstance(data['ResponseInfo'], dict):
            try:
                response_info_data = ResponseInfo(**data['ResponseInfo'])
            except ValidationError as e:
                logger.warning(f"Validation error for ResponseInfo: {e}")
                # Provide default or None

        # Process mdms list
        mdms_objects = []
        if 'mdms' in data and isinstance(data['mdms'], list):
            for item in data['mdms']:
                if not isinstance(item, dict):
                    continue

                try:
                    # Process data field if it exists
                    if 'data' in item and isinstance(item['data'], dict):
                        data_dict = item['data']

                        # Process columns if they exist
                        columns_list = []
                        if 'columns' in data_dict and isinstance(data_dict['columns'], list):
                            for col in data_dict['columns']:
                                if not isinstance(col, dict):
                                    continue

                                # Process mdmsSource if it exists
                                if 'mdmsSource' in col and isinstance(col['mdmsSource'], dict):
                                    try:
                                        col['mdmsSource'] = MDMSDataSource(**col['mdmsSource'])
                                    except ValidationError:
                                        col['mdmsSource'] = None

                                try:
                                    columns_list.append(MDMSColumn(**col))
                                except ValidationError:
                                    # Skip invalid column
                                    pass

                            data_dict['columns'] = columns_list if columns_list else None
                        else:
                            data_dict['columns'] = None

                        try:
                            item['data'] = MDMSData(**data_dict)
                        except ValidationError:
                            item['data'] = None

                    # Process auditDetails if it exists
                    if 'auditDetails' in item and isinstance(item['auditDetails'], dict):
                        try:
                            item['auditDetails'] = MDMSAuditDetails(**item['auditDetails'])
                        except ValidationError:
                            item['auditDetails'] = None

                    # Create MDMS object
                    mdms_obj = MDMS(**item)
                    mdms_objects.append(mdms_obj)
                except ValidationError as e:
                    logger.warning(f"Validation error for MDMS item: {e}")
                    # Skip invalid item

        # Create response object with proper field names
        try:
            return IngestionSchemaResponse(
                response_info=response_info_data,
                mdms=mdms_objects if mdms_objects else None
            )
        except ValidationError as e:
            logger.warning(f"Validation error when creating response object: {e}")
            # Try with explicit field names matching the class definition
            return IngestionSchemaResponse(**{
                "ResponseInfo": response_info_data,
                "mdms": mdms_objects if mdms_objects else None
            })

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON string in convert_json_to_object: {e}", exc_info=True)
        return None
    except ValidationError as e:
        logger.error(f"Data validation failed in convert_json_to_object: {e}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"Unexpected error in convert_json_to_object: {e}", exc_info=True)
        return None


def convert_json_to_boundary(json_str: str) -> List[Boundary]:
    data = json.loads(json_str)
    locations = [Boundary(**item) for item in data]
    return locations


def create_vendor_request(request_info: RequestInfo, vendor: Vendor):
    return {
        "RequestInfo": request_info.model_dump(by_alias=True, exclude_none=True),
        "organisations": [{
            "tenantId": LIVELIHOOD_TENANT_ID,
            "name": vendor.vendor_name,
            "code": None,
            "orgAddress": [
                {
                    "tenantId": LIVELIHOOD_TENANT_ID,
                    "boundaryType": "country",
                    "boundaryCode": vendor.country_boundary_code,
                    "hqAddress": vendor.hq_address
                }
            ],
            "contactDetails": [
                {
                    "contactName": vendor.vendor_name,
                    "contactMobileNumber": vendor.poc_phone
                }
            ],
            "identifiers": [
                {
                    "type": vendor.identifier_type,
                    "value": vendor.identifier_value
                }
            ],
            "functions": [
                {
                    "type": "",
                    "subType": ""
                }
            ],
            "isActive": True

        }]
    }


def get_project_creation_payload(request_info: RequestInfo, project_name: str, project_type: str,
                                 parent_id:str, start_date:str, end_date:str, subType:str):
    return {
        "RequestInfo": request_info.model_dump(by_alias=True, exclude_none=True),
        "Projects": [{
            "tenantId": LIVELIHOOD_TENANT_ID,
            "name": project_name,
            "projectType": project_type,
            "parent": parent_id,
            "startDate": start_date,
            "endDate": end_date,
            "projectSubType": subType,
            "department": "",
            "description" :"",
            "referenceID" : "1"
        }],
        "isCascadingProjectDateUpdate": False,
        "apiOperation": "CREATE"
    }

def get_installation_spoc_creation_payload(request_info: RequestInfo, name:str, mobile_number:str, email:str):
    current_date = datetime.datetime.now()
    current_timestamp = int(time.mktime(current_date.timetuple()) * 1000)
    return {
        "RequestInfo": request_info.model_dump(by_alias=True, exclude_none=True),
        "Employees": [
            {
                "tenantId": LIVELIHOOD_TENANT_ID,
                "employeeStatus": "EMPLOYED",
                "dateOfAppointment": current_timestamp,
                "employeeType": "PERMANENT",
                "user": {
                    "name": name,
                    "mobileNumber": mobile_number,
                    "emailId": email,
                    "roles": [
                        {"code": "INSTALLATION_REPORT_VIEWER", "name": "Installation report viewer"},
                        {"code": "HRMS_ADMIN", "name": "Hrms admin"}
                    ],
                    "tenantId": LIVELIHOOD_TENANT_ID,
                },
                "code": name,
                "jurisdictions": [
                    {
                        "hierarchy": "ADMIN",
                        "roles": [
                            {"code": "INSTALLATION_REPORT_VIEWER", "name": "Installation report viewer"},
                            {"value": "HRMS_ADMIN", "label": "Hrms admin"}
                        ],
                        "boundaryType": "City",
                        "boundary": "in",
                        "furnishedRolesList": "INSTALLATION_REPORT_VIEWER, HRMS_ADMIN",
                        "tenantId": LIVELIHOOD_TENANT_ID,
                    }
                ],
                "assignments": [
                    {
                        "fromDate": current_timestamp,
                        "toDate": "",
                        "isCurrentAssignment": True,
                        "department": "DEPT_1",
                        "designation": "DESIG_01"
                    }
                ],
                "serviceHistory": [],
                "education": [],
                "tests": [],
            }
        ],
    }

def get_user_creation_payload_staff(request_info: RequestInfo, row: Series):
    current_date = datetime.datetime.now()
    current_timestamp = int(time.mktime(current_date.timetuple()) * 1000)

    return {
        "RequestInfo": request_info.model_dump(by_alias=True, exclude_none=True),
        "Employees": [
            {
                "tenantId": LIVELIHOOD_TENANT_ID,
                "employeeStatus": "EMPLOYED",
                "dateOfAppointment": current_timestamp,
                "employeeType": "PERMANENT",
                "user": {
                    "name": row.get("Name", ""),
                    "mobileNumber": row.get("Phone Number", ""),
                    "emailId": row.get("Email Address", ""),
                    "roles": [
                        {"code": "INSTALLATION_REPORT_PART_A_EDITOR", "name": "Installation Report Part A Editor"},
                        {"code": "EMPLOYEE", "name": "employee"}
                    ],
                    "tenantId": LIVELIHOOD_TENANT_ID,
                },
                "code": row.get("Name", ""),
                "jurisdictions": [
                    {
                        "hierarchy": "ADMIN",
                        "roles": [
                            {"code": "INSTALLATION_REPORT_PART_A_EDITOR", "name": "Installation Report Part A Editor"},
                            {"code": "EMPLOYEE", "name": "employee"}
                        ],
                        "boundaryType": "City",
                        "boundary": "in",
                        "furnishedRolesList": "INSTALLATION_REPORT_PART_A_EDITOR, EMPLOYEE",
                        "tenantId": LIVELIHOOD_TENANT_ID,
                    }
                ],
                "assignments": [
                    {
                        "fromDate": current_timestamp,
                        "toDate": "",
                        "isCurrentAssignment": True,
                        "department": "DEPT_1",
                        "designation": "DESIG_01"
                    }
                ],
                "serviceHistory": [],
                "education": [],
                "tests": [],
            }
        ],
    }

def get_user_creation_payload_supervisors(request_info: RequestInfo, row: Series):
    current_date = datetime.datetime.now()
    current_timestamp = int(time.mktime(current_date.timetuple()) * 1000)

    return {
        "RequestInfo": request_info.model_dump(by_alias=True, exclude_none=True),
        "Employees": [
            {
                "tenantId": LIVELIHOOD_TENANT_ID,
                "employeeStatus": "EMPLOYED",
                "dateOfAppointment": current_timestamp,
                "employeeType": "PERMANENT",
                "user": {
                    "name": row.get("Name", ""),
                    "mobileNumber": row.get("Phone Number", ""),
                    "emailId": row.get("Email Address", ""),
                    "roles": [
                        {"code": "INSTALLATION_REPORT_PART_B_EDITOR", "name": "Installation Report Part B Editor"},
                        {"code": "INSTALLATION_REPORT_PART_A_REVIEWER", "name": "Installation Report Part A Reviewer"},
                        {"code": "EMPLOYEE", "name": "employee"}
                    ],
                    "tenantId": LIVELIHOOD_TENANT_ID,
                },
                "code": row.get("Name", ""),
                "jurisdictions": [
                    {
                        "hierarchy": "ADMIN",
                        "roles": [
                            {"code": "INSTALLATION_REPORT_PART_B_EDITOR", "name": "Installation Report Part B Editor"},
                            {"code": "INSTALLATION_REPORT_PART_A_REVIEWER", "name": "Installation Report Part A Reviewer"},
                            {"code": "EMPLOYEE", "name": "employee"}
                        ],
                        "boundaryType": "City",
                        "boundary": "in",
                        "furnishedRolesList": "INSTALLATION_REPORT_PART_B_EDITOR, INSTALLATION_REPORT_PART_A_REVIEWER, EMPLOYEE",
                        "tenantId": LIVELIHOOD_TENANT_ID,
                    }
                ],
                "assignments": [
                    {
                        "fromDate": current_timestamp,
                        "toDate": "",
                        "isCurrentAssignment": True,
                        "department": "DEPT_1",
                        "designation": "DESIG_01"
                    }
                ],
                "serviceHistory": [],
                "education": [],
                "tests": [],
            }
        ],
    }

def get_staff_creation_payload(request_info:RequestInfo, user_uuid:str, parent_id:str):
    current_date = datetime.datetime.now()
    one_year_later = current_date.replace(year=current_date.year + 1)
    current_timestamp = int(time.mktime(current_date.timetuple()) * 1000)
    one_year_later_timestamp = int(time.mktime(one_year_later.timetuple()) * 1000)

    return {
        "RequestInfo": request_info.model_dump(by_alias=True, exclude_none=True),
        "ProjectStaff":{
            "userId":user_uuid,
            "projectId":parent_id,
            "startDate": current_timestamp,
            "endDate": one_year_later_timestamp,
            "channel": "MOBILE",
            "isDeleted": False,
            "tenantId": LIVELIHOOD_TENANT_ID
        }
    }

def get_staff_search_payload(request_info:RequestInfo, user_uuid:str):
    return {
        "RequestInfo": request_info.model_dump(by_alias=True, exclude_none=True),
        "ProjectStaff":{
            "staffId": [user_uuid]
        }
    }

def safe_get(row, key, default=None):
    val = row.get(key, default)
    return default if pd.isna(val) else val


def create_facility_payload(
        request_info: RequestInfo,
        row: Series,
        are_facilities_onm_ready: bool,
        facility_schema: List[Dict[str, Any]],
):
    facility_category_name = safe_get(row, 'Category (Mandatory)')
    facility_category_code = get_mdms_code_by_name(facility_schema, 'Category', facility_category_name)

    # "Sectors" is the renamed "Type of HC" -> maps to the existing facility_type field.
    sector_name = safe_get(row, 'Sectors (Mandatory)')
    facility_type_code = get_mdms_code_by_name(facility_schema, 'Sectors', sector_name)

    # Solution Design Type (non-mandatory) -> facility_details.solar_solution_design_type
    # Optional mdms field: only resolve a code when a value is actually provided.
    solution_design_name = safe_get(row, 'Solution Design Type')
    if solution_design_name is not None and str(solution_design_name).strip().lower() not in ('', 'nan', 'none'):
        solution_design_code = get_mdms_code_by_name(facility_schema, 'Solution Design Type', solution_design_name)
    else:
        solution_design_code = None

    # Livelihood: the single "End user Name" is used both as the end-user contact name
    # and as the facility name (no separate facility-name column in the template).
    end_user_name = safe_get(row, 'End user Name (Mandatory)')

    poc_username_hdr = next(
        (format_col_name(c) for c in facility_schema if c.get("code") == "facility_poc_username"),
        None,
    )

    # Preferred Language (optional mdms field): resolve the display name -> MDMS code (en_IN/kn_IN).
    preferred_language_name = safe_get(row, 'Preferred Language')
    if preferred_language_name is not None and str(preferred_language_name).strip().lower() not in ('', 'nan', 'none'):
        preferred_language_code = get_mdms_code_by_name(facility_schema, 'Preferred Language', preferred_language_name)
    else:
        preferred_language_code = None

    facility_record = {
        'tenant_id': LIVELIHOOD_TENANT_ID,
        'facility_name': end_user_name,
        'facility_category': facility_category_code,
        'facility_type': facility_type_code,
        'facility_details': {
            'solar_solution_design_type': solution_design_code,
            'pocDesignation': safe_get(row, 'End user Designation'),
        },
        'facility_ownership': safe_get(row, 'Ownership', 'GOVERNMENT'),
        'facility_region': safe_get(row, 'Region', 'RURAL'),
        'isActive': True,
        'blockBoundaryCode': safe_get(row, 'Boundary Code (Mandatory)'),
        'address': {
            'tenantId': LIVELIHOOD_TENANT_ID,
            'latitude': safe_get(row, 'Latitude'),
            'longitude': safe_get(row, 'Longitude'),
            'addressLine1': safe_get(row, 'Address'),
            'state': safe_get(row, 'State (Mandatory)'),
            'district': safe_get(row, 'District (Mandatory)'),
            'block': safe_get(row, 'Block (Mandatory)')
        },
        'facility_poc_name': end_user_name,
        'facility_poc_phone': safe_get(row, 'End user Contact number (Mandatory)'),
        'facility_poc_email': safe_get(row, 'End user Email'),
        'facility_status': 'ACTIVE',
        'isOnmReady': True,
        'additionalDetails': {'preferredLanguage': preferred_language_code},
    }
    if poc_username_hdr:
        facility_record['facility_poc_username'] = safe_get(row, poc_username_hdr)

    return {
        'RequestInfo': request_info.model_dump(by_alias=True, exclude_none=True),
        'facilities': [facility_record]
    }


def create_asset_payload(
    request_info: RequestInfo,
    row: Series,
    asset_schema: List[Dict[str, Any]],
    vendor_lookup: Dict[str, str],
):
    """Build the asset-registry create payload for one template row.
    Reads each value by the template header derived from the asset schema
    (column name + '(Mandatory)' for required columns)."""

    def header_for(code: str) -> Optional[str]:
        for c in asset_schema:
            if c.get("code") == code:
                indicator = "(Mandatory)" if c.get("required") else ""
                return f"{c.get('name')} {indicator}".strip()
        return None

    def val(code: str):
        h = header_for(code)
        return safe_get(row, h) if h else None

    def is_blank(v) -> bool:
        return v is None or str(v).strip().lower() in ("", "nan", "none")

    def parse_warranty_start(v):
        if is_blank(v):
            return None
        if isinstance(v, datetime):
            return int(v.timestamp() * 1000)
        s = str(v).strip()
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                return int(datetime.strptime(s, fmt).timestamp() * 1000)
            except ValueError:
                continue
        return None

    def to_int(v):
        if is_blank(v):
            return None
        try:
            return int(float(str(v).strip()))
        except (ValueError, TypeError):
            return None

    # Item Code is an MDMS dropdown (livelihood.ItemCode): the cell holds the master's
    # display name, so resolve it to the code asset-registry validates against.
    item_code_val = val("itemCode")
    if is_blank(item_code_val):
        raise ValueError("Item Code is required")
    item_code_code = resolve_mdms_value(asset_schema, "Item Code", item_code_val)

    # Brand ID is an MDMS dropdown (asset-registry.Brand); required per schema, but
    # resolved defensively here too in case that ever changes to optional.
    brand_val = val("brandID")
    brand_code = None if is_blank(brand_val) else resolve_mdms_value(asset_schema, "Brand ID", brand_val)

    # System is an MDMS dropdown (asset-registry.SystemSchema, nested); optional,
    # defaults to the baseline non-solar code when left blank.
    system_val = val("system")
    system_code = "LIVELIHOOD" if is_blank(system_val) else resolve_mdms_value(asset_schema, "System", system_val)

    # Vendor Code (username) resolves to the vendor user's UUID so im-services can
    # directly assign the incident ticket to that specific person (isUuid → true path).
    vendor_code_val = val("vendorId")
    if is_blank(vendor_code_val):
        raise ValueError("Vendor Code is required")
    vendor_code_str = str(vendor_code_val).strip()
    if vendor_code_str not in vendor_lookup:
        raise ValueError(f"Unknown Vendor Code: '{vendor_code_str}'")
    vendor_id = vendor_lookup[vendor_code_str]

    asset = {
        "tenantId": LIVELIHOOD_TENANT_ID,
        "facilityID": val("facilityID"),
        "itemCode": item_code_code,
        "name": val("name"),
        "vendorId": vendor_id,
        "assetTypeID": val("assetTypeID"),
        "serialNumber": val("serialNumber"),
        "brandID": brand_code,
        "system": system_code,
        "modelNumber": val("modelNumber"),
        "boundaryCode": val("boundaryCode"),
        "warrantyStartDate": parse_warranty_start(val("warrantyStartDate")),
        "warrantyDuration": to_int(val("warrantyDuration")),
        "isOperational": True,
        "isActive": True,
    }
    # Drop empty optional fields so they aren't sent as blanks.
    asset = {k: v for k, v in asset.items() if not (v is None or (isinstance(v, str) and v.strip() == ""))}
    # asset-registry persists name inside assetDetails (the asset table has no name column;
    # AssetRowMapper reads assetDetails.name, else falls back to assetTypeID). Store it there too.
    name_val = val("name")
    if name_val is not None and str(name_val).strip() != "":
        asset["assetDetails"] = {"name": str(name_val).strip()}
    # asset-registry dereferences documents without a null-check -> always send an empty list.
    asset["documents"] = []

    return {
        "RequestInfo": request_info.model_dump(by_alias=True, exclude_none=True),
        "assetDetail": {"Asset": asset},
    }


def convert_response_to_facility(response: Dict[str, Any], role_type: str):
    return {
        "Country": "India",
        "State": response["address"]["state"],
        "District": response["address"]["district"],
        "Block": response["address"]["block"],
        "Boundary Code (Mandatory)": response["boundaryCode"],
        "Health Centre Name (Mandatory)": response["facility_name"],
        "Type of HC (Mandatory)": response["facility_type"],
        "HFR ID": response["facility_details"]["hfr_id"],
        "NIN ID": "",
        "Facility ID": response["facility_id"],
        "HC PoC Name (Mandatory)": response["facility_details"]["pocName"],
        "HC PoC Designation": "",
        "HC PoC Contact Number (Mandatory)": response["facility_details"]["pocContact"],
        "Latitude": response["address"]["latitude"],
        "Longitude": response["address"]["longitude"],
        "Address": (response["address"]["addressNumber"] or "") + " " + (response["address"]["addressLine1"] or "") + " " \
           + (response["address"]["addressLine2"] or "") + " " + (response["address"]["landmark"] or "") + " " \
           + (response["address"]["city"] or "") + " " + (response["address"]["pincode"] or ""),
        "Role": role_type,
        "Name": "",
        "Gender": "",
        "Phone Number": "",
        "Email Address": ""
    }

def create_project_payload(request_info: RequestInfo, row: Series):
    def to_epoch(date_str: str) -> int:
        try:
            dt = datetime.datetime.strptime(date_str.strip(), "%d/%m/%Y")
            return int(dt.timestamp() * 1000)
        except ValueError:
            raise ValueError(f"Date '{date_str}' is not in the format DD/MM/YYYY")
    return {
        'RequestInfo': request_info.model_dump(by_alias=True, exclude_none=True),
        'Projects': [
            {
                'tenantId': LIVELIHOOD_TENANT_ID,
                'name': safe_get(row, 'Project Name'),
                'projectType': safe_get(row, 'Project Type'),
                'projectSubType': safe_get(row, 'Project Sub Type'),
                'department': safe_get(row, 'Project Department'),
                'description': safe_get(row, 'Project Description'),
                'referenceID': safe_get(row, 'Project Reference ID'),
                'parent': safe_get(row, 'Parent Project ID'),
                'startDate': to_epoch(safe_get(row, 'Project Start Date (DD/MM/YYYY)')),
                'endDate': to_epoch(safe_get(row, 'Project End Date (DD/MM/YYYY)')),
                'address': {
                    'boundary': safe_get(row, 'Boundary Code'),
                    'boundaryType': safe_get(row, 'Boundary Type'),
                }
            }
        ],
        'isCascadingProjectDateUpdate': False,
        'apiOperation': 'CREATE'
    }


def get_mdms_code_by_name(schema_list: List[Dict[str, Any]], field_name: str, value: str) -> str:
    """
    From schema_list, finds the entry where `name` matches `field_name` and then returns the `code`
    of the mdms_value where `name` == value.

    Raises:
        ValueError: If the field_name or value is not found in the schema.
    """
    for schema in schema_list:
        if schema.get('name') == field_name:
            for item in schema.get('mdms_values', []):
                if item.get('name') == value:
                    return item.get('code')
            raise ValueError(f"Invalid value '{value}' for field '{field_name}' in MDMS schema.")

    raise ValueError(f"Field name '{field_name}' not found in MDMS schema.")


def resolve_mdms_value(schema_list: List[Dict[str, Any]], field_name: str, display_value: str) -> str:
    """
    Generalized sibling of get_mdms_code_by_name, built on the schema's `mdms_options`
    (display/value pairs already resolved per the column's mdmsSource.mode) instead of a
    hardcoded name/code lookup.

    Raises:
        ValueError: If the field_name or display_value is not found in the MDMS schema.
    """
    for schema in schema_list:
        if schema.get('name') == field_name:
            for option in schema.get('mdms_options', []):
                if option.get('display') == display_value:
                    return option.get('value')
            raise ValueError(f"Invalid value '{display_value}' for field '{field_name}' in MDMS schema.")

    raise ValueError(f"Field name '{field_name}' not found in MDMS schema.")


def get_expected_roles_for_staff() -> List[str]:
    return ["INSTALLATION_REPORT_PART_A_EDITOR", "EMPLOYEE"]

def get_expected_roles_for_supervisor() -> List[str]:
    return ["INSTALLATION_REPORT_PART_B_EDITOR", "INSTALLATION_REPORT_PART_A_REVIEWER", "EMPLOYEE"]

def check_role_mismatch_for_user_type(existing_user: Dict[str, Any], user_type: str) -> Dict[str, Any]:
    if user_type.lower() == "staff" or user_type.lower() == "field_staff":
        expected_roles = get_expected_roles_for_staff()
    elif user_type.lower() == "supervisor" or user_type.lower() == "field_supervisor":
        expected_roles = get_expected_roles_for_supervisor()
    else:
        return {
            "has_mismatch": False,
            "current_roles": [],
            "expected_roles": [],
            "mismatch_details": f"Unknown user type: {user_type}"
        }

    # Extract current roles from user data
    current_roles = []
    user_data = existing_user.get("user", {})
    roles = user_data.get("roles", [])

    for role in roles:
        role_code = role.get("code", "")
        if role_code:
            current_roles.append(role_code)

    # Check for mismatches
    missing_roles = []
    unexpected_roles = []

    for expected_role in expected_roles:
        if expected_role not in current_roles:
            missing_roles.append(expected_role)

    for current_role in current_roles:
        if current_role not in expected_roles:
            unexpected_roles.append(current_role)

    has_mismatch = bool(missing_roles or unexpected_roles)

    mismatch_details = ""
    if has_mismatch:
        if missing_roles:
            mismatch_details += f"Missing roles: {', '.join(missing_roles)}. "
        if unexpected_roles:
            mismatch_details += f"Unexpected roles: {', '.join(unexpected_roles)}."

    return {
        "has_mismatch": has_mismatch,
        "current_roles": current_roles,
        "expected_roles": expected_roles,
        "mismatch_details": mismatch_details.strip()
    }

def get_incident_request_info():
    return {
        "apiId": "Rainmaker",
        "authToken": "222d0cf6-07c2-4d90-8a71-0292c200ae74",
        "userInfo": {
            "id": 1863,
            "userName": "8974350748",
            "salutation": None,
            "name": "Tingpai S",
            "gender": "MALE",
            "mobileNumber": "8974350748",
            "emailId": None,
            "altContactNumber": None,
            "pan": None,
            "aadhaarNumber": None,
            "permanentAddress": None,
            "permanentCity": None,
            "permanentPinCode": None,
            "correspondenceAddress": None,
            "correspondenceCity": None,
            "correspondencePinCode": None,
            "alternatemobilenumber": None,
            "active": True,
            "locale": None,
            "type": "EMPLOYEE",
            "accountLocked": False,
            "accountLockedDate": 0,
            "fatherOrHusbandName": "Mathihalli",
            "relationship": "FATHER",
            "signature": None,
            "bloodGroup": None,
            "photo": None,
            "identificationMark": None,
            "createdBy": 0,
            "lastModifiedBy": 24226,
            "tenantId": "nl",
            "roles": [
                {
                    "code": "SUPERUSER",
                    "name": "Super User",
                    "tenantId": "nl"
                },
                {
                    "code": "EMPLOYEE",
                    "name": "Employee",
                    "tenantId": "nl"
                },
                {
                    "code": "COMPLAINANT",
                    "name": "Complainant",
                    "tenantId": "nl"
                },
                {
                    "code": "COMPLAINT_FACILITATOR_2",
                    "name": "Complaint facilitator 2",
                    "tenantId": "nl"
                },
                {
                    "code": "COMPLAINT_ASSESSOR",
                    "name": "Complaint Assessor",
                    "tenantId": "nl"
                }
            ],
            "uuid": "8acc5b7b-4dcb-497a-ad08-5eef4f53442c",
            "createdDate": "17-04-2025 23:19:29",
            "lastModifiedDate": "04-07-2025 01:30:31",
            "dob": "1994-02-08",
            "pwdExpiryDate": "16-07-2025 23:19:29"
        },
        "msgId": "1751897062350|en_IN",
        "plainAccessRequest": {}
    }


def create_update_payload(search_response: dict, update_data: dict) -> dict:
    wrappers = search_response.get("IncidentWrappers") or []
    if not wrappers:
        raise ValueError("Incident not found in search response (empty IncidentWrappers).")
    incident_wrapper = wrappers[0]
    incident = incident_wrapper.get("incident", {})
    workflow = incident_wrapper.get("workflow", {})
    filed_date = incident.get("filedDate")

    if pd.isna(filed_date) or int(filed_date) == 0:
        formatted_date = ""
    else :
        dt = datetime.fromtimestamp(int(filed_date) / 1000)
        formatted_date = dt.strftime("%d/%m/%Y")



    request_info = get_incident_request_info()

    original_type = incident.get('incidentType', '')
    original_subtype = incident.get('incidentSubType', '')

    details = {
        "CS_COMPLAINT_DETAILS_TICKET_NO": incident.get("incidentId"),
        "CS_COMPLAINT_DETAILS_APPLICATION_STATUS": f"CS_COMMON_{incident.get('applicationStatus')}",
        "CS_ADDCOMPLAINT_TICKET_TYPE": f"SERVICEDEFS.{original_type.upper()}",
        "CS_ADDCOMPLAINT_TICKET_SUB_TYPE": f"SERVICEDEFS.{original_subtype.upper()}",
        "CS_ADDCOMPLAINT_SYSTEM_FUNCTIONAL": update_data.get("systemFunctional"),
        "CS_ADDCOMPLAINT_DISTRICT": incident.get("district", ""),
        "CS_ADDCOMPLAINT_BLOCK": incident.get("block", ""),
        "CS_ADDCOMPLAINT_HEALTH_CARE_CENTRE": incident.get("tenantId", ""),
        "CS_COMPLAINT_COMMENTS": incident.get("comments", ""),
        "CS_ADDCOMPLAINT_HEALTH_CARE_SUB_TYPE": incident.get("phcSubType", ""),
        "CS_COMPLAINT_FILED_DATE": formatted_date
    }
    systemFunctional = update_data.get("systemFunctional")
    incident["systemFunctional"] = systemFunctional

    audit = {
        "details": incident.get("auditDetails", {}),
        "incidentType": original_subtype
    }

    return {
        "details": details,
        "workflow": workflow,
        "incident": incident,
        "audit": audit,
        "RequestInfo": request_info
    }


def _normalize_boundary_lookup_key(message: str) -> str:
    """Normalize a boundary label for reverse lookup (case/spacing/separator insensitive)."""
    return message.lower().strip().replace(" ", "").replace("/", "").replace("-", "")


def build_localization_reverse_map(messages: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """
    Build a reverse map from normalized localization message → list of localization codes.
    Only includes codes starting with "BOUNDARY_".
    """
    reverse_map: Dict[str, List[str]] = {}
    for m in messages:
        code = (m.get("code") or "").strip()
        message = (m.get("message") or "").strip()
        if code.startswith("BOUNDARY_") and message:
            key = _normalize_boundary_lookup_key(message)
            if key not in reverse_map:
                reverse_map[key] = []
            reverse_map[key].append(code)
    return reverse_map


def build_boundary_localization_map(
    boundary_list: List[Boundary],
    localization_service_url: str,
) -> Dict[str, str]:
    """
    Fetches localized display names for every country/state/district/block boundary code
    appearing in boundary_list. Localization messages are keyed by the full hierarchical
    boundary code (e.g. 'BOUNDARY_INDIA_ASSAM_BAKSA'), not by the leaf name alone, so this
    must use each level's own boundary code (country_code/state_code/district_code/block_code)
    rather than its display name.
    """
    all_raw_codes = set()
    for boundary in boundary_list:
        for field in ("country_code", "state_code", "district_code", "block_code"):
            val = boundary.get(field, "")
            if val:
                all_raw_codes.add(val)

    loc_codes = [f"BOUNDARY_{code}" for code in all_raw_codes]

    localization_map: Dict[str, str] = {}
    if localization_service_url and loc_codes:
        try:
            from app.utils.localization_service_client import LocalizationServiceClient
            loc_client = LocalizationServiceClient(localization_service_url)
            loc_response = loc_client.search_messages(
                tenant_id=LIVELIHOOD_TENANT_ID,
                locale="en_IN",
                module=LOCALIZATION_MODULE,
                codes=loc_codes,
            )
            for m in loc_response.get("messages", []):
                code = (m.get("code") or "").strip()
                message = m.get("message", "")
                if code and message:
                    localization_map[code] = message
        except Exception as e:
            logger.error(f"Error fetching boundary localizations: {e}", exc_info=True)

    return localization_map


def localize_boundary_name(raw_code: str, localization_map: Dict[str, str]) -> str:
    """Resolves a raw boundary code (e.g. state/district/block name) to its localized display name."""
    if not raw_code:
        return ""
    loc_key = f"BOUNDARY_{raw_code}"
    return localization_map.get(loc_key, loc_key)


def resolve_boundary_names_for_code(
    facility_boundary_code: str,
    boundary_list: List[Boundary],
    boundary_localization_map: Dict[str, str],
) -> tuple:
    """
    Given a facility's boundary_code (the block-level boundary code, optionally suffixed
    with a facility-specific code, e.g. "INDIA_ASSAM_UDALGURI_UDALGURI_ED/2026/0097"),
    finds the matching block-level Boundary and returns its localized (state, district, block)
    names. Returns ("", "", "") if no match is found.
    """
    if not facility_boundary_code:
        return "", "", ""
    for boundary in boundary_list:
        code = boundary.get("code", "")
        if not code:
            continue
        if facility_boundary_code == code or facility_boundary_code.startswith(code + "_"):
            return (
                localize_boundary_name(boundary.get("state_code", ""), boundary_localization_map),
                localize_boundary_name(boundary.get("district_code", ""), boundary_localization_map),
                localize_boundary_name(boundary.get("block_code", ""), boundary_localization_map),
            )
    return "", "", ""


def state_names_by_facility_id(
    facility_data: List[Dict[str, Any]],
    boundary_list: List[Boundary],
    boundary_localization_map: Dict[str, str],
) -> Dict[str, str]:
    """facility_id -> the state name, resolved exactly as the sheet's State column is.

    A facility record carries no state of its own. FacilityAddress declares state/district/
    block, but facility_address has no such columns and nothing in the read path fills them,
    so address.state is always null -- the state lives only in boundary_code. Resolving it
    here through the same helper the State column uses keeps the Solution dropdown and the
    upload validation keyed off one identical value; deriving them separately is what made
    the dropdown come back empty.
    """
    states: Dict[str, str] = {}
    for facility in facility_data:
        facility_id = facility.get("facility_id") or facility.get("facilityId")
        if not facility_id:
            continue
        boundary_code = facility.get("boundary_code") or facility.get("boundaryCode") or ""
        state_name, _, _ = resolve_boundary_names_for_code(
            boundary_code, boundary_list, boundary_localization_map
        )
        states[facility_id] = state_name
    return states


def resolve_boundary_code(
    state: str,
    district: str,
    block: str,
    reverse_map: Dict[str, List[str]],
) -> tuple:
    """
    Resolve a full boundary code from State/District/Block using
    the localization reverse map.

    Returns (boundary_code, error_message).
    If successful, error_message is None.
    """
    country = "INDIA"

    # --- State ---
    state_normalized = _normalize_boundary_lookup_key(state) if state else ""
    if not state_normalized or state_normalized == "nan":
        return None, "State is not provided"

    state_candidates = reverse_map.get(state_normalized, [])
    if not state_candidates:
        return None, f"Boundary code for State '{state}' not found"

    state_prefix = f"BOUNDARY_{country}_"
    state_matches = [c for c in state_candidates if c.startswith(state_prefix) and '_' not in c[len(state_prefix):]]
    if not state_matches:
        return None, f"Boundary code for State '{state}' not found"
    if len(state_matches) > 1:
        return None, f"Boundary code for State '{state}' not found, multiple matches: {state_matches}"

    state_boundary = state_matches[0].replace("BOUNDARY_", "", 1)

    # --- District ---
    district_normalized = _normalize_boundary_lookup_key(district) if district else ""
    if not district_normalized or district_normalized == "nan":
        return None, "District is not provided"

    district_candidates = reverse_map.get(district_normalized, [])
    if not district_candidates:
        return None, f"Boundary code for District '{district}' not found"

    district_prefix = f"BOUNDARY_{state_boundary}_"
    district_matches = [c for c in district_candidates if c.startswith(district_prefix) and '_' not in c[len(district_prefix):]]
    if not district_matches:
        return None, f"Boundary code for District '{district}' under State '{state}' not found"
    if len(district_matches) > 1:
        return None, f"Boundary code for District '{district}' under State '{state}' not found, multiple matches: {district_matches}"

    district_boundary = district_matches[0].replace("BOUNDARY_", "", 1)

    # --- Block ---
    block_normalized = _normalize_boundary_lookup_key(block) if block else ""
    if not block_normalized or block_normalized == "nan":
        return None, "Block is not provided"

    block_candidates = reverse_map.get(block_normalized, [])
    if not block_candidates:
        return None, f"Boundary code for Block '{block}' not found"

    block_prefix = f"BOUNDARY_{district_boundary}_"
    block_matches = [c for c in block_candidates if c.startswith(block_prefix) and '_' not in c[len(block_prefix):]]
    if not block_matches:
        return None, f"Boundary code for Block '{block}' under District '{district}' not found"
    if len(block_matches) > 1:
        return None, f"Boundary code for Block '{block}' under District '{district}' not found, multiple matches: {block_matches}"

    block_boundary = block_matches[0].replace("BOUNDARY_", "", 1)

    return block_boundary, None


def resolve_boundary_codes_for_dataframe(
    df: "pd.DataFrame",
    localization_service_url: str,
    boundary_code_column: str = "Boundary Code (Mandatory)",
    logger=None,
) -> "pd.DataFrame":
    """
    Resolve boundary codes from State/District/Block columns for every row
    in the DataFrame. Populates `boundary_code_column` with the resolved code.
    Rows that fail resolution get status='FAILED' and the error in 'error'.
    """
    if boundary_code_column not in df.columns:
        df[boundary_code_column] = ''

    reverse_map = {}
    if localization_service_url:
        try:
            from app.utils.localization_service_client import LocalizationServiceClient
            loc_client = LocalizationServiceClient(localization_service_url)
            loc_response = loc_client.search_messages(
                tenant_id=LIVELIHOOD_TENANT_ID,
                locale="en_IN",
                module=LOCALIZATION_MODULE,
            )
            messages = loc_response.get("messages", [])
            if logger:
                logger.info(f"Localization service returned {len(messages)} messages for boundary resolution")
            reverse_map = build_localization_reverse_map(messages)
            if logger:
                logger.info(f"Built reverse map with {len(reverse_map)} entries")
        except Exception as e:
            if logger:
                logger.error(f"Error fetching localizations for boundary resolution: {e}", exc_info=True)
    else:
        if logger:
            logger.warning("localization_service_url is not set; boundary code resolution will be skipped")

    if logger:
        logger.info(f"DataFrame columns: {list(df.columns)}")

    for index, row in df.iterrows():
        raw_code = row.get(boundary_code_column, '')
        existing_code = '' if pd.isna(raw_code) else str(raw_code).strip()
        if existing_code:
            continue

        state_col = 'State (Mandatory)' if 'State (Mandatory)' in df.columns else 'State'
        district_col = 'District (Mandatory)' if 'District (Mandatory)' in df.columns else 'District'
        block_col = 'Block (Mandatory)' if 'Block (Mandatory)' in df.columns else 'Block'

        raw_state = row.get(state_col, '')
        raw_district = row.get(district_col, '')
        raw_block = row.get(block_col, '')
        state_val = '' if pd.isna(raw_state) else str(raw_state).strip()
        district_val = '' if pd.isna(raw_district) else str(raw_district).strip()
        block_val = '' if pd.isna(raw_block) else str(raw_block).strip()

        if not reverse_map:
            df.at[index, 'status'] = 'FAILED'
            df.at[index, 'error'] = 'Localization service unavailable; cannot resolve boundary code'
            continue

        boundary_code, error = resolve_boundary_code(
            state=state_val,
            district=district_val,
            block=block_val,
            reverse_map=reverse_map,
        )
        if error:
            df.at[index, 'status'] = 'FAILED'
            df.at[index, 'error'] = error
        else:
            df.at[index, boundary_code_column] = boundary_code

    return df