import logging
from typing import Any, Dict, List

import pandas as pd

from app.utils.excel_utils import add_dropdowns_to_excel
from app.utils.file_utils import create_empty_excel_file, create_excel_data_writer, remove_default_empty_sheet

logger = logging.getLogger(__name__)

ASSET_SHEET_NAME = "AssetIngestionTemplate"


class AssetTemplateService:
    """Generates the livelihood asset bulk-ingestion template from the MDMS
    data-ingestion.AssetIngestionSchema column definitions. Mirrors the facility
    template generation but has no boundary/vendor sheets (assets take facilityID +
    boundaryCode directly)."""

    def generate_asset_template_file(self, output_path: str, asset_schema: List[Dict[str, Any]]) -> None:
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

                # Dropdowns only where the schema column carries MDMS values.
                mdms_values = col.get("mdms_values")
                if mdms_values:
                    options = [item.get("name") for item in mdms_values if item.get("name")]
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

            remove_default_empty_sheet(output_path)
            logger.info(f"Successfully created asset ingestion template at {output_path}")
        except Exception as e:
            logger.error(f"Error generating asset template file: {e}")
            raise
