import logging
from typing import Any, Dict, List

import pandas as pd

from app.utils.excel_utils import add_dropdowns_to_excel, autofit_columns, lock_excel_columns
from app.utils.file_utils import create_empty_excel_file, create_excel_data_writer, remove_default_empty_sheet

logger = logging.getLogger(__name__)

ASSET_SHEET_NAME = "AssetIngestionTemplate"
FACILITY_DETAILS_SHEET_NAME = "End User Details"
VENDOR_CODES_SHEET_NAME = "Vendor Codes"


class AssetTemplateService:
    """Generates the livelihood asset bulk-ingestion template from the MDMS
    data-ingestion.AssetIngestionSchema column definitions. Also carries
    read-only "End User Details" and "Vendor Codes" lookup sheets so the
    person filling the sheet can find the End User Id and vendor Username to type
    into the main sheet (vendorId is resolved to the vendor's UUID id at
    asset-creation time so tickets raised against the asset auto-assign)."""

    def generate_asset_template_file(
        self,
        output_path: str,
        asset_schema: List[Dict[str, Any]],
        facility_data: List[Dict[str, Any]] = None,
        vendor_records: List[Dict[str, Any]] = None,
    ) -> None:
        try:
            create_empty_excel_file(output_path)

            output_list: List[str] = []
            dropdowns_map: Dict[str, List[str]] = {}
            allow_blank_map: Dict[str, bool] = {}

            for col in asset_schema:
                mandatory_indicator = "(Mandatory)" if col.get("required") else ""
                header_name = f"{col.get('name')} {mandatory_indicator}".strip()
                output_list.append(header_name)
                allow_blank_map[header_name] = not col.get("required", False)

                # Dropdowns only where the schema column carries MDMS options.
                mdms_options = col.get("mdms_options")
                if mdms_options:
                    options = [opt.get("display") for opt in mdms_options if opt.get("display")]
                    if options:
                        dropdowns_map[header_name] = options

            df_asset = pd.DataFrame(columns=output_list)
            writer = create_excel_data_writer(output_path, ASSET_SHEET_NAME)
            writer.write_data(df_asset)

            add_dropdowns_to_excel(
                file_path=output_path,
                sheet_name=ASSET_SHEET_NAME,
                dropdowns=dropdowns_map,
                allow_blank_map=allow_blank_map,
            )

            # Facility Details lookup sheet (read-only reference for End User Id etc.)
            facility_records = self._format_facility_data(facility_data or [])
            df_facility = pd.DataFrame(facility_records)
            facility_writer = create_excel_data_writer(output_path, FACILITY_DETAILS_SHEET_NAME)
            facility_writer.write_data(df_facility)

            # Vendor Codes lookup sheet (reference for Vendor Code).
            df_vendor = pd.DataFrame(vendor_records or [])
            vendor_writer = create_excel_data_writer(output_path, VENDOR_CODES_SHEET_NAME)
            vendor_writer.write_data(df_vendor)

            autofit_columns(
                file_path=output_path,
                sheet_name=ASSET_SHEET_NAME,
                auto_fit=True,
                max_rows_to_scan=10,
                enable_wrap_text=False,
            )
            autofit_columns(
                file_path=output_path,
                sheet_name=FACILITY_DETAILS_SHEET_NAME,
                auto_fit=True,
                max_rows_to_scan=10,
                enable_wrap_text=False,
            )
            autofit_columns(
                file_path=output_path,
                sheet_name=VENDOR_CODES_SHEET_NAME,
                auto_fit=True,
                max_rows_to_scan=10,
                enable_wrap_text=False,
            )

            remove_default_empty_sheet(output_path)
            logger.info(f"Successfully created asset ingestion template at {output_path}")
        except Exception as e:
            logger.error(f"Error generating asset template file: {e}")
            raise

    def _format_facility_data(self, facility_data: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        records = []
        for facility in facility_data:
            address = facility.get("address") or {}
            records.append({
                "End User Id": facility.get("facility_id", ""),
                "End User Name": facility.get("facility_name", ""),
                "Sectors": facility.get("facility_type", ""),
                "Contact Number": facility.get("facility_poc_phone", ""),
                "Boundary Code": facility.get("boundaryCode", ""),
            })
        return records
