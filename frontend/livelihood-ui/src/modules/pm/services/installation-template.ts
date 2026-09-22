import { extractApiErrorMessage } from "@/shared";
import type { AuthUser } from "@/shared/stores/auth-store";
import {
  extractBlobApiErrorMessage,
  postJsonExpectingBlob,
  postMultipartExpectingBlob,
  postMultipartExpectingJson,
} from "../utils/ingestion-request";
import type { DownloadedFile } from "../utils/file-download";
import { BULK_PAGE_SIZE, postSearch } from "../utils/url-params";

export class InstallationTemplateApiError extends Error {}

export interface TemplateValidationResult {
  file: DownloadedFile;
  errorCount: number;
}

/**
 * `POST /ingestion-service/template/installationTemplate` — JSON body, **snake_case**:
 * `{ fieldplan_id, solution_code }`. Response: `.xlsx` blob, sheet-protected (only
 * Product/Make/Capacity/Quantity + the two header fields editable) — deliberate, not a bug.
 */
export async function downloadSolutionTemplate(
  planId: string,
  solutionCode: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<DownloadedFile> {
  return postJsonExpectingBlob(
    "/ingestion-service/template/installationTemplate",
    { fieldplan_id: planId, solution_code: solutionCode },
    `installation-template-${solutionCode}-${planId}.xlsx`,
    accessToken,
    user,
  );
}

/**
 * `POST /ingestion-service/ingest/installationTemplateValidateData` — multipart: `template_file`,
 * `fieldplan_id`, `solution_code`, `request_info`. Response: annotated xlsx blob + `X-Error-Count`
 * header. The Solar Panel/Battery/Inverter-PCU quantity-required rule is enforced server-side —
 * nothing to replicate here, just surface whatever error count comes back.
 */
export async function validateSolutionTemplate(
  file: File,
  planId: string,
  solutionCode: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<TemplateValidationResult> {
  try {
    const { blob, errorCount } = await postMultipartExpectingBlob(
      "/ingestion-service/ingest/installationTemplateValidateData",
      { fieldplan_id: planId, solution_code: solutionCode },
      file,
      "template_file",
      accessToken,
      user,
    );
    return { file: { blob, filename: `installation-template-validated-${file.name}` }, errorCount };
  } catch (error) {
    throw new InstallationTemplateApiError(
      (await extractBlobApiErrorMessage(error)) ?? "IC report template validation failed",
    );
  }
}

interface CreateInstallationTemplateResponse {
  fieldPlanId?: string;
  solutionId?: string;
  message?: string;
}

/**
 * `POST /ingestion-service/ingest/createInstallationTemplate` — multipart: validated
 * `template_file`, `fieldplan_id`, `solution_code`, `request_info`. **Returns JSON, not a blob**
 * (unlike every other ingestion-service create/validate call in this module) —
 * `{fieldPlanId, solutionId, machineCount, solarLineItemCount, fieldCount, formIds,
 * tenderNumber, purchaseOrderNumber, message}`.
 */
export async function createSolutionTemplate(
  planId: string,
  solutionCode: string,
  validatedFile: DownloadedFile,
  accessToken: string,
  user?: AuthUser | null,
): Promise<boolean> {
  const file = new File([validatedFile.blob], validatedFile.filename, {
    type: validatedFile.blob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  try {
    const data = await postMultipartExpectingJson<CreateInstallationTemplateResponse>(
      "/ingestion-service/ingest/createInstallationTemplate",
      { fieldplan_id: planId, solution_code: solutionCode },
      file,
      "template_file",
      accessToken,
      user,
    );
    return Boolean(data.message);
  } catch (error) {
    throw new InstallationTemplateApiError(extractApiErrorMessage(error) ?? "IC report template creation failed");
  }
}

/**
 * `POST /field-planner/v1/field-plan-templates/_search` — verifies which solutions in the plan
 * already have a saved template (schema v2's flat `fields`). Used to gate advancing past this step:
 * every distinct solution in scope needs a row here or Stage 4 fails `TEMPLATE_MISSING`.
 *
 * The response array key is the plural `FieldPlanTemplates` — proven live: reading the singular
 * `FieldPlanTemplate` (matching the *request* body's key) silently returned undefined, so this
 * always resolved an empty Set even when a template genuinely existed.
 */
export async function searchFieldPlanTemplateSolutionIds(
  planId: string,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<Set<string>> {
  const data = await postSearch<{ FieldPlanTemplates?: Array<{ solutionId?: string }> }>(
    "/field-planner/v1/field-plan-templates/_search",
    "FieldPlanTemplate",
    { tenantId: user?.tenantId, fieldPlanId: planId },
    { accessToken, user, limit: BULK_PAGE_SIZE },
  );

  return new Set((data.FieldPlanTemplates ?? []).map((template) => template.solutionId).filter(Boolean) as string[]);
}
