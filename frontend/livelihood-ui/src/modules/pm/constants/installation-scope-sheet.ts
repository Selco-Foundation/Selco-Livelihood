// Worksheet names inside the Excel workbooks that `ingestion-service` generates and
// reads back — sent as the `facility_sheet_name` / `boundary_sheet_name` multipart
// fields by `services/installation-scope.ts` and `services/ingestion.ts`. The column
// layout itself lives server-side in MDMS; nothing on the client parses sheet rows.
export const SCOPE_SHEET_NAME = "FacilityMapping";
export const SCOPE_BOUNDARY_SHEET_NAME = "BoundaryCodes";
