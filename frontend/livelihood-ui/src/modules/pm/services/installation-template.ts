// No `/ingestion-service` backend endpoint is wired up yet — these functions
// simulate the per-solution IC report template download/validate/create
// round-trip with static data. Swap each body for the matching request
// (documented above it) once the real ingestion service is available.

import type { DownloadedFile } from "../utils/file-download";

export interface TemplateValidationResult {
  file: DownloadedFile;
  errorCount: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock stand-in for `POST /ingestion-service/template/installationTemplate`
 * (body: `{ RequestInfo, fieldplan_id, solution_code }`, response: an xlsx
 * blob with a blank BOM/Associated Machines form plus a read-only `Sites`
 * sheet). Always serves the blank template — nothing is stored to resume
 * from, matching the real behavior.
 */
export async function downloadSolutionTemplate(planId: string, solutionCode: string): Promise<DownloadedFile> {
  await delay(400);
  const csv = "Sl. No.,Product,Make,Capacity,Quantity\n";
  return {
    blob: new Blob([csv], { type: "text/csv" }),
    filename: `installation-template-${solutionCode}-${planId}.csv`,
  };
}

/**
 * Mock stand-in for `POST /ingestion-service/ingest/installationTemplateValidateData`
 * (multipart: `template_file`, `fieldplan_id`, `solution_code`; response: an
 * annotated xlsx blob plus an `x-error-count` header).
 *
 * `simulateErrors` is a UI-development-only knob (no backend to actually
 * validate against yet) so both the success and failure paths can be
 * exercised — remove it once real validation responses drive this.
 */
export async function validateSolutionTemplate(
  file: File,
  solutionCode: string,
  simulateErrors = false,
): Promise<TemplateValidationResult> {
  await delay(500);

  if (simulateErrors) {
    const report =
      "row,column,error\n" +
      `2,Product,Product is required for solution ${solutionCode}\n` +
      "4,Quantity,Quantity must be greater than 0\n";
    return {
      file: { blob: new Blob([report], { type: "text/csv" }), filename: `validation-errors-${file.name}` },
      errorCount: 2,
    };
  }

  return {
    file: { blob: file, filename: file.name },
    errorCount: 0,
  };
}

/**
 * Mock stand-in for `POST /ingestion-service/ingest/createInstallationTemplate`
 * (multipart: validated `template_file`, `fieldplan_id`, `solution_code`).
 */
export async function createSolutionTemplate(
  _planId: string,
  _solutionCode: string,
  validatedFile: DownloadedFile,
): Promise<DownloadedFile> {
  await delay(400);
  return validatedFile;
}
