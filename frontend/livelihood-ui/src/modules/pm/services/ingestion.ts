import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";

export interface BoundaryTreeNode {
  boundaryCode: string;
  type: "country" | "state" | "district" | "block";
  name: string;
  tenantId?: string;
  children?: BoundaryTreeNode[];
}

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

function filenameFromContentDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1] ?? fallback;
}

export async function downloadFacilityIngestionTemplate(
  projectId: string,
  boundaryData: BoundaryTreeNode,
  accessToken: string,
  user: AuthUser | null | undefined,
): Promise<DownloadedFile> {
  const response = await apiClient.post(
    "/ingestion-service/template/facilityIngestionTemplateWithData",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      project_id: projectId,
      boundary_data: boundaryData,
    },
    { responseType: "blob" },
  );

  return {
    blob: response.data as Blob,
    filename: filenameFromContentDisposition(
      response.headers["content-disposition"],
      "facility_ingestion_template.xlsx",
    ),
  };
}

export interface ValidationResult {
  file: DownloadedFile;
  errorCount: number;
}

export class IngestionApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionApiError";
  }
}

async function parseBlobErrorDetail(blob: Blob): Promise<string> {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text) as { detail?: string };
    return parsed.detail ?? text;
  } catch {
    return "Request failed";
  }
}

export async function validateFacilitiesExcel(
  projectId: string,
  file: File | Blob,
  filename: string,
  accessToken: string,
  user: AuthUser | null | undefined,
): Promise<ValidationResult> {
  const formData = new FormData();
  formData.append("facility_file", file, filename);
  formData.append("project_id", projectId);
  formData.append("request_info", JSON.stringify(createRequestInfo(accessToken, user)));

  try {
    const response = await apiClient.post(
      "/ingestion-service/ingest/facilitiesValidateData",
      formData,
      { headers: { "Content-Type": "multipart/form-data" }, responseType: "blob" },
    );

    const errorCountHeader =
      response.headers["x-error-count"] ?? response.headers["X-Error-Count"];

    return {
      file: {
        blob: response.data as Blob,
        filename: filenameFromContentDisposition(
          response.headers["content-disposition"],
          "facility_validation_results.xlsx",
        ),
      },
      errorCount: Number(errorCountHeader ?? 0),
    };
  } catch (error) {
    const axiosError = error as { response?: { data?: Blob; status?: number } };
    if (axiosError.response?.data instanceof Blob) {
      throw new IngestionApiError(await parseBlobErrorDetail(axiosError.response.data));
    }
    throw error;
  }
}

export async function createFacilitiesAndUpdateProject(
  projectId: string,
  validatedFile: File | Blob,
  filename: string,
  accessToken: string,
  user: AuthUser | null | undefined,
): Promise<DownloadedFile> {
  const formData = new FormData();
  formData.append("facility_file", validatedFile, filename);
  formData.append("project_id", projectId);
  formData.append("request_info", JSON.stringify(createRequestInfo(accessToken, user)));

  try {
    const response = await apiClient.post(
      "/ingestion-service/ingest/createFacilityAndUpdateProject",
      formData,
      { headers: { "Content-Type": "multipart/form-data" }, responseType: "blob" },
    );

    return {
      blob: response.data as Blob,
      filename: filenameFromContentDisposition(
        response.headers["content-disposition"],
        "facility_creation_and_project_update_results.xlsx",
      ),
    };
  } catch (error) {
    const axiosError = error as { response?: { data?: Blob } };
    if (axiosError.response?.data instanceof Blob) {
      throw new IngestionApiError(await parseBlobErrorDetail(axiosError.response.data));
    }
    throw error;
  }
}
