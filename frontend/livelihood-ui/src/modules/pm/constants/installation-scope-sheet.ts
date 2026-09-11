// Column layout for the Installation Scope Excel round-trip — stands in for
// the real MDMS `data-ingestion.InstallationScopeIngestionSchema` used by
// `ingestion-service`'s `fieldplanFacilityIngestionTemplate` /
// `fieldPlanfacilitiesValidateData` / `createFieldPlanFacility` endpoints.
// Keep this in sync with `services/installation-scope.ts`, which reads and
// writes rows in this exact column order.

export const SCOPE_SHEET_NAME = "FacilityMapping";
export const SCOPE_BOUNDARY_SHEET_NAME = "BoundaryCodes";

export const SCOPE_SHEET_HEADERS = [
  "Site Name",
  "Village",
  "State",
  "District",
  "Block",
  "Sector",
  "End User Id (Mandatory)",
  "Included in Field Plan",
  "Solution",
  "Lock Status",
] as const;

export type ScopeSheetHeader = (typeof SCOPE_SHEET_HEADERS)[number];
