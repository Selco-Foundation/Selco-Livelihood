// No `/ingestion-service` backend endpoint is wired up yet — these functions
// simulate the real 3-endpoint Installation Scope Excel round-trip (per
// `Selco-Livelihood/development/Installation_Plan_Changes/WORKFLOW_END_TO_END.md`
// and the as-built `ingestion-service` source) with static data + an
// in-browser CSV parser standing in for the xlsx workbook. Swap each body
// for the matching request (documented above it) once the real service is
// available — the row/column shapes here already match what it expects.

import { END_USER_SITES } from "../constants/end-user-sites";
import { SCOPE_SHEET_HEADERS } from "../constants/installation-scope-sheet";
import { SOLUTION_OPTIONS } from "../constants/solutions";
import { MOCK_BOUNDARY_HIERARCHY } from "../constants/boundary-data";
import type { InstallationPlanScopeEntry } from "../types/installation-plan";
import type { DownloadedFile } from "../utils/file-download";

export interface ScopeSheetRow {
  siteId: string;
  siteName: string;
  village: string;
  state: string;
  district: string;
  block: string;
  sector: string;
  included: boolean;
  solutionName: string;
  lockStatus: string;
  /** Populated once `validateScopeSheet` has run. */
  validationStatus?: "PASSED" | "FAILED";
  validationError?: string;
  /** Populated once `createScopeFromSheet` has run. */
  linkStatus?: "Linked" | "Already Linked" | "Unlinked";
}

export interface ScopeValidationResult {
  rows: ScopeSheetRow[];
  errorCount: number;
  file: DownloadedFile;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function boundaryName(kind: "states" | "districts" | "blocks", code: string): string {
  return MOCK_BOUNDARY_HIERARCHY[kind].find((option) => option.code === code)?.name ?? code;
}

function solutionNameByCode(code: string | undefined): string {
  return SOLUTION_OPTIONS.find((solution) => solution.code === code)?.name ?? "";
}

/** The scope sheet accepts the display name from our mock template or the
 * stable solution code used by the API-backed workbook. */
function findSolution(value: string | undefined) {
  const normalized = value?.trim();
  return SOLUTION_OPTIONS.find((solution) => solution.code === normalized || solution.name === normalized);
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function rowsToCsv(headers: readonly string[], rows: string[][]): string {
  return [headers.map(csvEscape).join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
}

/** Minimal CSV line splitter that understands double-quoted fields — good
 *  enough for the sheets this mock itself generates. */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function buildRowsForSector(sectorCode: string, existingScope: InstallationPlanScopeEntry[]): ScopeSheetRow[] {
  const entryBySiteId = new Map(existingScope.map((entry) => [entry.siteId, entry]));
  const sites = sectorCode ? END_USER_SITES.filter((site) => site.sectorCode === sectorCode) : END_USER_SITES;

  return sites.map((site) => {
    const existing = entryBySiteId.get(site.id);
    return {
      siteId: site.id,
      siteName: site.name,
      village: boundaryName("blocks", site.blockCode),
      state: boundaryName("states", site.stateCode),
      district: boundaryName("districts", site.districtCode),
      block: boundaryName("blocks", site.blockCode),
      sector: site.sectorCode,
      included: existing?.included ?? false,
      solutionName: solutionNameByCode(existing?.solutionCode),
      lockStatus: existing?.lockStatus ?? "",
    };
  });
}

function rowsToSheet(rows: ScopeSheetRow[], extraHeaders: string[] = [], extraColumns: string[][] = []): string {
  const headers = [...SCOPE_SHEET_HEADERS, ...extraHeaders];
  const dataRows = rows.map((row, index) => [
    row.siteName,
    row.village,
    row.state,
    row.district,
    row.block,
    row.sector,
    row.siteId,
    row.included ? "Yes" : "No",
    row.solutionName,
    row.lockStatus,
    ...(extraColumns[index] ?? []),
  ]);
  return rowsToCsv(headers, dataRows);
}

/**
 * Mock stand-in for `POST /ingestion-service/template/fieldplanFacilityIngestionTemplate`
 * (body: `{ RequestInfo, fieldplan_id, sector_code }`, response: an xlsx blob
 * with a `FacilityMapping` sheet plus a read-only `BoundaryCodes` sheet).
 * Rows are the end-user sites matching the plan's sector, pre-filled from
 * whatever scope already exists so a re-download resumes cleanly.
 */
export async function downloadScopeTemplate(
  _planId: string,
  sectorCode: string,
  existingScope: InstallationPlanScopeEntry[],
): Promise<DownloadedFile> {
  await delay(500);
  const rows = buildRowsForSector(sectorCode, existingScope);
  const csv = rowsToSheet(rows);
  return {
    blob: new Blob([csv], { type: "text/csv" }),
    filename: `installation-scope-${_planId}.csv`,
  };
}

function canForFallback(sectorCode: string): ScopeSheetRow[] {
  const rows = buildRowsForSector(sectorCode, []);
  return rows.map((row, index) => ({
    ...row,
    included: index < 2,
    solutionName: index < 2 ? (SOLUTION_OPTIONS.find((s) => s.sectorCode === row.sector)?.name ?? "") : "",
  }));
}

/**
 * Mock stand-in for `POST /ingestion-service/ingest/fieldPlanfacilitiesValidateData`
 * (multipart: `scope_file`, `fieldplan_id`, `sector_code`; response: an
 * annotated xlsx blob plus an `X-Error-Count` header). Until the real
 * service is wired, the normal path supplies a valid static scope so the UI
 * can progress; the dev toggle below is the only source of forced errors.
 *
 * `simulateErrors` is a UI-development-only knob (no backend to actually
 * validate against yet) so the failure path can be exercised even against a
 * clean sheet — remove it once real validation responses drive this.
 */
export async function validateScopeSheet(
  file: File,
  sectorCode: string,
  simulateErrors = false,
): Promise<ScopeValidationResult> {
  await delay(700);

  const text = await file.text().catch(() => "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headerLine = lines[0] ? parseCsvLine(lines[0]) : [];
  const looksLikeOurSheet = SCOPE_SHEET_HEADERS.every((header) => headerLine.includes(header));

  let rows: ScopeSheetRow[];

  if (looksLikeOurSheet) {
    rows = lines.slice(1).map((line) => {
      const cells = parseCsvLine(line);
      const [siteName, village, state, district, block, sector, siteId, includedRaw, solutionName, lockStatus] =
        cells;
      return {
        siteId: siteId ?? "",
        siteName: siteName ?? "",
        village: village ?? "",
        state: state ?? "",
        district: district ?? "",
        block: block ?? "",
        sector: sector ?? "",
        included: (includedRaw ?? "").trim().toLowerCase() === "yes",
        solutionName: (solutionName ?? "").trim(),
        lockStatus: lockStatus ?? "",
      };
    });
  } else {
    rows = canForFallback(sectorCode);
  }

  // In this static-only UI, "No" means a successful mock validation no
  // matter which CSV was selected. Return a complete, valid scope (including
  // two selected sites) so automatic scope application and the next wizard
  // stage can be exercised without manually editing a workbook.
  if (!simulateErrors) {
    const validated = canForFallback(sectorCode).map((row) => ({
      ...row,
      validationStatus: "PASSED" as const,
      validationError: undefined,
    }));
    const csv = rowsToSheet(
      validated,
      ["status", "error"],
      validated.map((row) => [row.validationStatus, row.validationError ?? ""]),
    );
    return {
      rows: validated,
      errorCount: 0,
      file: { blob: new Blob([csv], { type: "text/csv" }), filename: `installation-scope-validated-${file.name}` },
    };
  }

  let errorCount = 0;
  const validated = rows.map((row) => {
    let error: string | undefined;

    if (row.included && !row.solutionName) {
      error = "Solution is required when the site is included in the field plan";
    } else if (!row.included && row.solutionName) {
      error = "Solution must be empty unless the site is included in the field plan";
    } else if (row.solutionName) {
      const solution = findSolution(row.solutionName);
      if (!solution || (sectorCode && solution.sectorCode !== sectorCode)) {
        error = `Solution '${row.solutionName}' is not valid for sector '${row.sector}' and state '${row.state}'`;
      }
    }

    if (error) errorCount++;
    return { ...row, validationStatus: error ? ("FAILED" as const) : ("PASSED" as const), validationError: error };
  });

  const hasAnyIncluded = validated.some((row) => row.included && row.validationStatus === "PASSED");
  if (!hasAnyIncluded && errorCount === 0) {
    errorCount = 1;
    validated.forEach((row) => {
      if (row === validated[0]) {
        row.validationStatus = "FAILED";
        row.validationError = "No end user sites are selected for this installation plan";
      }
    });
  }

  if (simulateErrors && errorCount === 0 && validated[0]) {
    validated[0].validationStatus = "FAILED";
    validated[0].validationError = "Solution is required when the site is included in the field plan";
    validated[0].included = true;
    validated[0].solutionName = "";
    errorCount = 1;
  }

  const csv = rowsToSheet(
    validated,
    ["status", "error"],
    validated.map((row) => [row.validationStatus ?? "PASSED", row.validationError ?? ""]),
  );

  return {
    rows: validated,
    errorCount,
    file: { blob: new Blob([csv], { type: "text/csv" }), filename: `installation-scope-validated-${file.name}` },
  };
}

/**
 * Mock stand-in for `POST /ingestion-service/ingest/createFieldPlanFacility`
 * (multipart: validated `scope_file`, `fieldplan_id`; all-or-nothing on any
 * non-`PASSED` row). Returns the scope entries to persist on the plan plus
 * the sheet re-emitted with an appended `Field Plan Linking Status` column.
 */
export async function createScopeFromSheet(
  rows: ScopeSheetRow[],
): Promise<{ entries: InstallationPlanScopeEntry[]; file: DownloadedFile }> {
  await delay(600);

  const linked = rows.map((row) => ({
    ...row,
    linkStatus: !row.included ? ("Unlinked" as const) : row.lockStatus === "LOCKED" ? ("Already Linked" as const) : ("Linked" as const),
  }));

  const entries: InstallationPlanScopeEntry[] = linked
    .filter((row) => row.included)
    .map((row) => ({
      siteId: row.siteId,
      included: true,
      solutionCode: findSolution(row.solutionName)?.code,
      lockStatus: "LOCKED",
      linkStatus: row.linkStatus,
    }));

  const csv = rowsToSheet(
    linked,
    ["Field Plan Linking Status"],
    linked.map((row) => [row.linkStatus ?? "Unlinked"]),
  );

  return {
    entries,
    file: { blob: new Blob([csv], { type: "text/csv" }), filename: "installation-scope-linking-report.csv" },
  };
}
