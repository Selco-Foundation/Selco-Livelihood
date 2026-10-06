import pandas as pd

from app.core.logging import AppLogger
from app.ingest.boundary_excel_data_loader import BoundaryExcelDataLoader
from app.ingest.boundary_name_collision_validator import BoundaryNameCollisionValidator
from app.processor.boundary_data_processor import BoundaryDataProcessor
from app.utils.boundary_code_utils import (
    build_boundary_full_code,
    normalize_boundary_segment,
)

logger = AppLogger().get_logger()


class BoundaryValidationProcessor(BoundaryDataProcessor):
    """Dry run for boundary ingestion: report what a real run would do, write nothing.

    Subclasses BoundaryDataProcessor purely to reuse its loading, validation and
    existence-checking. It deliberately does not touch process_data() or anything
    else on the ingestion path - /boundaries keeps the exact behaviour it has
    today, and this class is only reachable from the validation endpoint.

    It adds one validator of its own, BoundaryNameCollisionValidator, which flags
    a name used under two different parents in the same sheet. That case is
    silently dropped during a real ingestion, so surfacing it here is the point of
    the endpoint.
    """

    @classmethod
    def from_processor(cls, processor: BoundaryDataProcessor) -> "BoundaryValidationProcessor":
        """Build a validation processor from one the normal factory produced.

        Reuses the loader and the configured validators so validation sees exactly
        what ingestion would, then adds the collision check on top.
        """
        validators = list(processor.validators) + [BoundaryNameCollisionValidator()]
        return cls(
            processor.data_loader,
            validators,
            processor.data_writer,
            processor.request_info,
        )

    def validate_only(self) -> pd.DataFrame:
        """Load, validate and check what already exists. Creates nothing.

        Returns the DataFrame carrying each row's validation state, or an empty
        DataFrame when the data loader is not a boundary loader.
        """
        if not isinstance(self.data_loader, BoundaryExcelDataLoader):
            logger.warning("Data loader is not compatible")
            return pd.DataFrame()

        boundary_df = self.data_loader.get_boundary_data()
        boundary_df["status"] = None
        boundary_df["error"] = ""

        for validator in self.validators:
            boundary_df = validator.validate(boundary_df)

        self._collect_validation_errors(boundary_df)

        # Organise the rows that passed, then ask the boundary service what is
        # already there. Both calls are reads.
        valid_boundaries_df = boundary_df[boundary_df["status"].isna()]
        self._organize_boundary_data(valid_boundaries_df)
        self._check_existing_boundaries()
        self._check_existing_relationships()
        self.pre_existing_relationship_codes = set(self.successful_relationship_codes)

        return boundary_df

    def annotate_results(self, boundary_df: pd.DataFrame) -> pd.DataFrame:
        """Mark each surviving row 'exists' or 'would_create'.

        Rows the validators rejected keep their 'fail' / 'skipped' status. A row
        counts as 'exists' only when every level it names is already present *and*
        already linked into the SELCO hierarchy - an unlinked boundary still needs
        work, so it reports as 'would_create'.
        """
        for index, row in boundary_df.iterrows():
            if self._row_already_decided(row):
                continue

            pending = [
                full_code
                for full_code in self._row_full_codes(row)
                if not self._boundary_exists(full_code)
                or full_code not in self.pre_existing_relationship_codes
            ]

            if pending:
                boundary_df.loc[index, "status"] = "would_create"
                boundary_df.loc[index, "error"] = "Would create: " + ", ".join(pending)
            else:
                boundary_df.loc[index, "status"] = "exists"
                boundary_df.loc[index, "error"] = ""

        return boundary_df

    @staticmethod
    def _row_already_decided(row) -> bool:
        status = row.get("status")
        return not pd.isna(status) and str(status).strip().lower() not in ("", "none")

    @staticmethod
    def _row_full_codes(row):
        """Yield the full code of every level this row fully specifies."""
        country = normalize_boundary_segment(str(row.get("Country", "") or "").strip())
        state = normalize_boundary_segment(str(row.get("State", "") or "").strip())
        district = normalize_boundary_segment(str(row.get("District", "") or "").strip())
        block = normalize_boundary_segment(str(row.get("Block", "") or "").strip())

        if country:
            yield country
        if country and state:
            yield build_boundary_full_code(country, state)
        if country and state and district:
            yield build_boundary_full_code(country, state, district)
        if country and state and district and block:
            yield build_boundary_full_code(country, state, district, block)
