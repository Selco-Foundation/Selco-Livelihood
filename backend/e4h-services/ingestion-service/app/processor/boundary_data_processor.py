import os
from typing import List, Dict, Set, Tuple, Optional, Any
import re
import pandas as pd

from app.core.logging import AppLogger
from app.core.tenant import LIVELIHOOD_TENANT_ID, LOCALIZATION_MODULE
from app.ingest.boundary_excel_data_loader import BoundaryExcelDataLoader
from app.ingest.service.data_loader import DataLoader
from app.ingest.service.data_writer import DataWriter
from app.ingest.service.validator import Validator
from app.schemas.request_info import RequestInfo
from app.utils.boundary_code_utils import (
    build_boundary_full_code,
    normalize_boundary_segment,
    preserve_boundary_label,
)
from app.utils.boundary_service_client import BoundaryServiceClient
from app.utils.localization_service_client import LocalizationServiceClient

from dotenv import load_dotenv
load_dotenv()
boundary_service_url = os.getenv("BOUNDARY_SERVICE_URL")
localization_service_url = os.getenv("LOCALIZATION_SERVICE_URL")

logger = AppLogger().get_logger()


class BoundaryDataProcessor:
    def __init__(self, data_loader, validators: List[Validator], data_writer,
                 request_info: RequestInfo = None):
        self.data_loader = data_loader
        self.validators = validators
        self.data_writer = data_writer
        self.validation_errors = []
        self.request_info = request_info
        self.boundary_service_client = BoundaryServiceClient(boundary_service_url)
        self.localization_client = LocalizationServiceClient(localization_service_url)

        # Hierarchical structure to store boundary data
        self.hierarchy_levels = ["Country", "State", "District", "Block"]
        self.boundary_data: Dict[str, Dict] = {
            "Country": {},
            "State": {},
            "District": {},
            "Block": {}
        }

        # Track all boundary full codes that need to be checked/created
        self.all_boundary_full_codes: Set[str] = set()

        # Track which boundaries already exist in the system
        self.existing_boundaries: Set[str] = set()
        # casefold(code) -> canonical code from boundary service
        self.existing_boundaries_casefold: Dict[str, str] = {}

        # Track failed operations
        self.failed_boundaries: Dict[str, str] = {}  # {full_code: error_message}
        self.failed_relationships: Dict[Tuple[str, str], str] = {}  # {(full_code, boundary_type): error_message}

    def process_data(self):
        """Process and validate boundary data"""

        if isinstance(self.data_loader, BoundaryExcelDataLoader):
            boundary_df = self.data_loader.get_boundary_data()
            logger.info(boundary_df.head(2))
        else:
            logger.warning("Data loader is not compatible")
            return pd.DataFrame()

        boundary_df["status"] = None
        boundary_df["error"] = ""

        # Run all validators
        has_error = False
        for validator in self.validators:
            boundary_df = validator.validate(boundary_df)
            if (boundary_df["status"] == "fail").any():
                has_error = True

        # Collect validation errors
        self._collect_validation_errors(boundary_df)

        # Process valid boundaries
        valid_boundaries_df = boundary_df[boundary_df["status"].isna()]
        self._organize_boundary_data(valid_boundaries_df)
        self._check_existing_boundaries()
        self._create_new_boundaries()
        self._create_boundary_relationships()
        self._upsert_localization_for_boundaries()

        # Update the DataFrame with boundary creation results
        boundary_df = self._update_dataframe_with_results(boundary_df)

        return boundary_df

    def _collect_validation_errors(self, boundary_df):
        """Collect validation errors from the DataFrame"""
        self.validation_errors = []
        for idx, row in boundary_df[boundary_df["status"] == "fail"].iterrows():
            self.validation_errors.append({
                'row': idx + 2,  # +2 for Excel row numbers (header + 1-based)
                'boundary_code': row.get('Country', 'Unknown'),
                'errors': [row.get('error', '')]
            })

    def _organize_boundary_data(self, boundary_df):
        """Organize boundary data into hierarchical structure with full codes"""
        for _, row in boundary_df.iterrows():
            country = normalize_boundary_segment(str(row.get('Country', '')).strip())
            state = normalize_boundary_segment(str(row.get('State', '')).strip())
            district = normalize_boundary_segment(str(row.get('District', '')).strip())
            block = normalize_boundary_segment(str(row.get('Block', '')).strip())

            country_label = preserve_boundary_label(row.get("Country"))
            state_label = preserve_boundary_label(row.get("State"))
            district_label = preserve_boundary_label(row.get("District"))
            block_label = preserve_boundary_label(row.get("Block"))

            # Country level
            if country:
                full_code = country
                self.all_boundary_full_codes.add(full_code)
                if country not in self.boundary_data["Country"]:
                    self.boundary_data["Country"][country] = {
                        "name": country,
                        "localization_label": country_label or country,
                        "parent": None,
                        "full_code": full_code
                    }

            # State level
            if state and country:
                full_code = build_boundary_full_code(country, state)
                self.all_boundary_full_codes.add(full_code)
                if state not in self.boundary_data["State"]:
                    self.boundary_data["State"][state] = {
                        "name": state,
                        "localization_label": state_label or state,
                        "parent": country,
                        "full_code": full_code
                    }

            # District level
            if district and state and country:
                full_code = build_boundary_full_code(country, state, district)
                self.all_boundary_full_codes.add(full_code)
                if district not in self.boundary_data["District"]:
                    self.boundary_data["District"][district] = {
                        "name": district,
                        "localization_label": district_label or district,
                        "parent": build_boundary_full_code(country, state),
                        "full_code": full_code
                    }

            # Block level
            if block and district and state and country:
                full_code = build_boundary_full_code(country, state, district, block)
                self.all_boundary_full_codes.add(full_code)
                if block not in self.boundary_data["Block"]:
                    self.boundary_data["Block"][block] = {
                        "name": block,
                        "localization_label": block_label or block,
                        "parent": build_boundary_full_code(country, state, district),
                        "full_code": full_code
                    }

        # Log summary
        for level in self.hierarchy_levels:
            logger.info(f"Found {len(self.boundary_data[level])} unique {level} boundaries")

    def _check_existing_boundaries(self):
        """Check which boundaries already exist in the system using their full codes"""
        if not self.all_boundary_full_codes:
            return

        # Split into chunks to avoid too long URLs
        chunk_size = 50
        codes_list = list(self.all_boundary_full_codes)

        for i in range(0, len(codes_list), chunk_size):
            chunk = codes_list[i:i + chunk_size]

            try:
                response_data = self.boundary_service_client.search_boundaries(
                    request_info=self.request_info,
                    tenant_id=LIVELIHOOD_TENANT_ID,
                    codes=chunk
                )

                if response_data and "Boundary" in response_data:
                    for boundary in response_data["Boundary"]:
                        code = boundary["code"]
                        self.existing_boundaries.add(code)
                        self.existing_boundaries_casefold[code.casefold()] = code
            except Exception as e:
                logger.error(f"Error checking existing boundaries: {e}")

        logger.info(f"Found {len(self.existing_boundaries)} existing boundaries in the system")

    def _boundary_exists(self, full_code: str) -> bool:
        return full_code.casefold() in self.existing_boundaries_casefold

    def _mark_boundary_failure(self, full_code: str, error_message: str) -> None:
        self.failed_boundaries[full_code] = error_message

    def _is_duplicate_boundary_error(self, error_message: Optional[str]) -> bool:
        if not error_message:
            return False
        normalized = error_message.casefold()
        return "duplicate" in normalized or "already exist" in normalized

    def _register_existing_boundary(self, full_code: str) -> None:
        self.existing_boundaries.add(full_code)
        self.existing_boundaries_casefold[full_code.casefold()] = full_code

    def _create_new_boundaries(self):
        """Create new boundaries that don't already exist"""
        boundaries_to_create = []

        # Prepare boundary creation data for all levels
        for level in self.hierarchy_levels:
            for code, data in self.boundary_data[level].items():
                full_code = data["full_code"]
                if full_code in self.failed_boundaries:
                    continue
                if self._boundary_exists(full_code):
                    continue
                boundaries_to_create.append({
                    "tenantId": LIVELIHOOD_TENANT_ID,
                    "code": full_code,
                    "geometry": None
                })

        if not boundaries_to_create:
            logger.info("No new boundaries to create")
            return

        # Create boundaries in chunks; on batch failure retry individually so
        # existing codes (e.g. INDIA) do not block new ones (e.g. YO/HO).
        chunk_size = 50
        for i in range(0, len(boundaries_to_create), chunk_size):
            chunk = boundaries_to_create[i:i + chunk_size]
            self._create_boundary_chunk(chunk, allow_individual_retry=True)

        logger.info(f"Attempted to create {len(boundaries_to_create)} boundaries. "
                    f"Failed: {len(self.failed_boundaries)}")

    def _create_boundary_chunk(
        self,
        chunk: List[Dict[str, Any]],
        *,
        allow_individual_retry: bool,
    ) -> None:
        try:
            response_data, error_message = self.boundary_service_client.create_boundaries(
                request_info=self.request_info,
                boundary_data=chunk,
            )

            if error_message:
                if allow_individual_retry and len(chunk) > 1:
                    logger.warning(
                        "Boundary batch create failed (%s); retrying %d boundaries individually",
                        error_message,
                        len(chunk),
                    )
                    for boundary in chunk:
                        self._create_boundary_chunk([boundary], allow_individual_retry=False)
                    return

                if self._is_duplicate_boundary_error(error_message):
                    for boundary in chunk:
                        self._register_existing_boundary(boundary["code"])
                    return

                for boundary in chunk:
                    self._mark_boundary_failure(boundary["code"], error_message)
                return

            created_boundaries = (response_data or {}).get("Boundary") or []
            if not created_boundaries:
                if allow_individual_retry and len(chunk) > 1:
                    for boundary in chunk:
                        self._create_boundary_chunk([boundary], allow_individual_retry=False)
                    return

                for boundary in chunk:
                    self._mark_boundary_failure(
                        boundary["code"],
                        "Failed to create boundary (empty response from boundary service)",
                    )
                return

            created_codes = {b["code"] for b in created_boundaries if b.get("code")}
            for boundary in chunk:
                code = boundary["code"]
                if code in created_codes:
                    continue
                if self._boundary_exists(code):
                    continue
                self._mark_boundary_failure(
                    code,
                    "Failed to create boundary (not returned by boundary service)",
                )
            logger.info(f"Successfully created {len(created_boundaries)} boundaries")
        except Exception as e:
            if allow_individual_retry and len(chunk) > 1:
                for boundary in chunk:
                    self._create_boundary_chunk([boundary], allow_individual_retry=False)
                return
            for boundary in chunk:
                self._mark_boundary_failure(boundary["code"], str(e))

    def _deepest_full_code_for_row(self, row) -> Optional[str]:
        country = normalize_boundary_segment(str(row.get('Country', '')).strip())
        state = normalize_boundary_segment(str(row.get('State', '')).strip())
        district = normalize_boundary_segment(str(row.get('District', '')).strip())
        block = normalize_boundary_segment(str(row.get('Block', '')).strip())

        if block and district and state and country:
            return build_boundary_full_code(country, state, district, block)
        if district and state and country:
            return build_boundary_full_code(country, state, district)
        if state and country:
            return build_boundary_full_code(country, state)
        if country:
            return country
        return None

    def _create_boundary_relationships(self):
        """Create boundary relationships in hierarchical order"""
        relationship_created_count = 0

        # Process relationships for each level
        for level in self.hierarchy_levels:
            for code, data in self.boundary_data[level].items():
                full_code = data["full_code"]
                parent_full_code = data["parent"]

                # Skip if boundary creation failed
                if full_code in self.failed_boundaries:
                    continue

                # Skip for country level (no parent)
                if level == "Country":
                    continue

                # Skip if parent creation failed
                if parent_full_code and parent_full_code in self.failed_boundaries:
                    self.failed_relationships[(full_code, level)] = f"Parent {parent_full_code} creation failed"
                    continue

                success, error = self._create_single_relationship(full_code, level, parent_full_code)
                if success:
                    relationship_created_count += 1
                elif error:
                    self.failed_relationships[(full_code, level)] = error

        logger.info(f"Successfully created {relationship_created_count} relationships. "
                    f"Failed: {len(self.failed_relationships)}")

    def _create_single_relationship(self, full_code, boundary_type, parent_full_code):
        """Create a single boundary relationship"""
        try:
            response_data = self.boundary_service_client.create_boundary_relationship(
                request_info=self.request_info,
                tenant_id=LIVELIHOOD_TENANT_ID,
                code=full_code,
                hierarchy_type="SELCO",
                boundary_type=boundary_type,
                parent=parent_full_code
            )

            if "Errors" in response_data:
                if any(error.get("code") == "DUPLICATE_RECORD" for error in response_data["Errors"]):
                    return True, None  # Relationship already exists
                else:
                    error_msg = ", ".join(error.get("message") for error in response_data["Errors"])
                    return False, error_msg
            return True, None

        except Exception as e:
            return False, str(e)

    def _upsert_localization_for_boundaries(self):
        """Upsert localization messages for all boundaries in this ingestion."""
        if not self.request_info:
            logger.warning("No RequestInfo; skipping localization upsert for boundaries")
            return
        if not localization_service_url:
            logger.warning("LOCALIZATION_SERVICE_URL not set; skipping localization upsert for boundaries")
            return

        messages = []
        for level in self.hierarchy_levels:
            for code, data in self.boundary_data[level].items():
                full_code = data["full_code"]
                # Human-readable label for localization (spaces preserved; leading/trailing stripped)
                raw_display_name = data.get("localization_label") or data.get("name") or code
                display_name = re.sub(r"\s+", " ", raw_display_name).strip()
                if not display_name:
                    continue
                messages.append({
                    "code": f"BOUNDARY_{full_code}",
                    "message": display_name,
                    "module": LOCALIZATION_MODULE,
                    "locale": "en_IN",
                })
        if not messages:
            logger.warning("No boundary localization messages to upsert")
            return

        logger.info(
            "Upserting localization for %d boundary level(s), module=%s, tenant=%s",
            len(messages),
            LOCALIZATION_MODULE,
            LIVELIHOOD_TENANT_ID,
        )
        chunk_size = 50
        for i in range(0, len(messages), chunk_size):
            chunk = messages[i : i + chunk_size]
            try:
                self.localization_client.upsert_messages(
                    request_info=self.request_info,
                    tenant_id=LIVELIHOOD_TENANT_ID,
                    messages=chunk,
                )
                logger.info(
                    "Upserted localization for %d boundaries (sample code=%s)",
                    len(chunk),
                    chunk[0]["code"],
                )
            except Exception as e:
                logger.error(
                    "Localization upsert failed for boundary batch starting with %s: %s",
                    chunk[0]["code"],
                    e,
                    exc_info=True,
                )

    def _update_dataframe_with_results(self, boundary_df):
        """Update the DataFrame with boundary creation results"""
        for index, row in boundary_df.iterrows():
            status = row["status"]
            if not pd.isna(status) and str(status).strip().lower() not in ("", "none"):
                continue  # Keep validation failures and skipped rows as-is

            row_failed = False
            row_errors = []

            deepest_code = self._deepest_full_code_for_row(row)
            if deepest_code and self._boundary_exists(deepest_code) and deepest_code not in self.failed_boundaries:
                existing_code = self.existing_boundaries_casefold[deepest_code.casefold()]
                row_failed = True
                row_errors.append(f"Boundary already exists: {existing_code}")

            country = normalize_boundary_segment(str(row.get('Country', '')).strip())
            state = normalize_boundary_segment(str(row.get('State', '')).strip())
            district = normalize_boundary_segment(str(row.get('District', '')).strip())
            block = normalize_boundary_segment(str(row.get('Block', '')).strip())

            # Check each level that exists in this row
            if country:
                full_code = country
                if full_code in self.failed_boundaries:
                    row_failed = True
                    row_errors.append(f"Failed to create Country '{country}': {self.failed_boundaries[full_code]}")

            if state and country:
                full_code = build_boundary_full_code(country, state)
                if full_code in self.failed_boundaries:
                    row_failed = True
                    row_errors.append(f"Failed to create State '{state}': {self.failed_boundaries[full_code]}")
                elif (full_code, "State") in self.failed_relationships:
                    row_failed = True
                    row_errors.append(
                        f"Failed relationship for State '{state}': {self.failed_relationships[(full_code, 'State')]}")

            if district and state and country:
                full_code = build_boundary_full_code(country, state, district)
                if full_code in self.failed_boundaries:
                    row_failed = True
                    row_errors.append(
                        f"Failed to create District '{district}': {self.failed_boundaries[full_code]}")
                elif (full_code, "District") in self.failed_relationships:
                    row_failed = True
                    row_errors.append(
                        f"Failed relationship for District '{district}': {self.failed_relationships[(full_code, 'District')]}")

            if block and district and state and country:
                full_code = build_boundary_full_code(country, state, district, block)
                if full_code in self.failed_boundaries:
                    row_failed = True
                    row_errors.append(f"Failed to create Block '{block}': {self.failed_boundaries[full_code]}")
                elif (full_code, "Block") in self.failed_relationships:
                    row_failed = True
                    row_errors.append(
                        f"Failed relationship for Block '{block}': {self.failed_relationships[(full_code, 'Block')]}")

            if row_failed:
                boundary_df.loc[index, "status"] = "fail"
                boundary_df.loc[index, "error"] = ", ".join(row_errors)
            else:
                boundary_df.loc[index, "status"] = "success"
                boundary_df.loc[index, "error"] = ""

        return boundary_df