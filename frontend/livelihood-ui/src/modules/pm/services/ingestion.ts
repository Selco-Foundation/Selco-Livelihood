// No `/ingestion-service` backend endpoint is wired up yet — these functions
// simulate the download/validate/create round-trip with static data. Swap
// each body for the matching request (documented above it) once the real
// ingestion service is available; the shapes below already match what it
// returns.

import type { DownloadedFile } from "../utils/file-download";
import { MOCK_BOUNDARY_HIERARCHY } from "../constants/boundary-data";
import { END_USER_SITES } from "../constants/end-user-sites";
import type { GeographyDetails } from "../types/project";

export interface ValidationResult {
  file: DownloadedFile;
  errorCount: number;
}

export class IngestionApiError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock stand-in for `POST /ingestion-service/template/facilityIngestionTemplateWithData`
 * (body: `{ RequestInfo, project_id, boundary_data }`, response: an xlsx blob).
 */
export async function downloadFacilityIngestionTemplate(
  projectId: string,
  geographyDetails: GeographyDetails,
): Promise<DownloadedFile> {
  await delay(400);
  const selectedBlockCodes = new Set(geographyDetails.blocks?.map((block) => block.code) ?? []);
  const boundaryName = (kind: "states" | "districts" | "blocks", code: string) =>
    MOCK_BOUNDARY_HIERARCHY[kind].find((boundary) => boundary.code === code)?.name ?? code;
  const headers = [
    "End User Id",
    "End User Name (Mandatory)",
    "State",
    "District",
    "Block",
    "Phone Number (Mandatory)",
    "Include in Project",
  ];
  const rows = END_USER_SITES.filter((site) => selectedBlockCodes.has(site.blockCode)).map((site) => [
    site.id,
    site.name,
    boundaryName("states", site.stateCode),
    boundaryName("districts", site.districtCode),
    boundaryName("blocks", site.blockCode),
    site.phoneNumber,
    "No",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => (/[,"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(","))
    .join("\n");
  return {
    blob: new Blob([csv], { type: "text/csv" }),
    filename: `facility-ingestion-template-${projectId}.csv`,
  };
}

/**
 * Mock stand-in for `POST /ingestion-service/ingest/facilitiesValidateData`
 * (multipart: `facility_file`, `project_id`, `request_info`; response: an
 * xlsx blob plus an `x-error-count` header). Swap for the real multipart
 * upload once the backend exists — the returned shape already matches.
 *
 * `simulateErrors` is a UI-development-only knob (no backend to actually
 * validate against yet) so both the success and failure paths can be
 * exercised — remove it once real validation responses drive this.
 */
export async function validateFacilitiesExcel(file: File, simulateErrors = false): Promise<ValidationResult> {
  await delay(600);

  if (simulateErrors) {
    const report =
      "row,column,error\n" +
      "2,latitude,Latitude is out of range\n" +
      "5,contact_number,Contact number must be 10 digits\n" +
      "7,facility_name,Facility name is required\n";
    return {
      file: { blob: new Blob([report], { type: "text/csv" }), filename: `validation-errors-${file.name}` },
      errorCount: 3,
    };
  }

  return {
    file: { blob: file, filename: file.name },
    errorCount: 0,
  };
}

/**
 * Mock stand-in for `POST /ingestion-service/ingest/createFacilityAndUpdateProject`
 * (multipart: validated `facility_file`, `project_id`, `request_info`).
 */
export async function createFacilitiesAndUpdateProject(validatedFile: DownloadedFile): Promise<DownloadedFile> {
  await delay(600);
  return validatedFile;
}
