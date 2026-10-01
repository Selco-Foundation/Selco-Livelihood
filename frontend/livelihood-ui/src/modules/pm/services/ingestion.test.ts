import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, i18n } from "@/shared";
import {
  createFacilitiesAndUpdateProject,
  downloadFacilityIngestionTemplate,
  IngestionApiError,
  validateFacilitiesExcel,
} from "./ingestion";
import type { GeographyDetails } from "../types/project";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } };
});

// i18n isn't initialized in tests, so i18n.t() returns undefined for any key rather than
// echoing the key back the way real i18next does once loaded — stub it to match production.
beforeEach(() => {
  vi.spyOn(i18n, "t").mockImplementation(((key: string) => key) as typeof i18n.t);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const geography: GeographyDetails = { states: [{ code: "KA" }] };

describe("downloadFacilityIngestionTemplate", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the project's boundary tree and returns the blob with a derived filename", async () => {
    const blob = new Blob(["workbook"]);
    vi.mocked(apiClient.post).mockResolvedValue({ data: blob });

    const result = await downloadFacilityIngestionTemplate("project-1", geography, "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/ingestion-service/template/facilityIngestionTemplateWithData",
      expect.objectContaining({ project_id: "project-1" }),
      expect.objectContaining({ responseType: "blob" }),
    );
    expect(result).toEqual({ blob, filename: "project-end-user-sites-project-1.xlsx" });
  });
});

describe("validateFacilitiesExcel", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns the annotated blob and error count on success", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: new Blob(["annotated"]),
      headers: { "x-error-count": "5" },
    });

    const result = await validateFacilitiesExcel(new File(["x"], "sites.xlsx"), "project-1", "token-1");

    expect(result.errorCount).toBe(5);
    expect(result.file.filename).toBe("project-end-user-sites-validated-sites.xlsx");
  });

  it("throws IngestionApiError with the server's message on failure", async () => {
    const errorBlob = new Blob([JSON.stringify({ Errors: [{ message: "Boundary mismatch" }] })]);
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: errorBlob, status: 400 } });

    await expect(
      validateFacilitiesExcel(new File(["x"], "sites.xlsx"), "project-1", "token-1"),
    ).rejects.toMatchObject({ message: "Boundary mismatch", status: 400 });
  });

  it("rejects with an IngestionApiError instance and a translated fallback when no message is extractable", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: new Blob(["not json"]), status: 500 } });

    await expect(
      validateFacilitiesExcel(new File(["x"], "sites.xlsx"), "project-1", "token-1"),
    ).rejects.toBeInstanceOf(IngestionApiError);
  });
});

describe("createFacilitiesAndUpdateProject", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns the result workbook blob under a report filename", async () => {
    const blob = new Blob(["report"]);
    vi.mocked(apiClient.post).mockResolvedValue({ data: blob, headers: {} });

    const result = await createFacilitiesAndUpdateProject(
      { blob: new Blob(["validated"]), filename: "validated.xlsx" },
      "project-1",
      "token-1",
    );

    expect(result).toEqual({ blob, filename: "project-end-user-sites-report-project-1.xlsx" });
  });

  it("throws IngestionApiError with the message extracted from the blob error body", async () => {
    const errorBlob = new Blob([JSON.stringify({ error: { message: "Row failed" } })]);
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: errorBlob, status: 400 } });

    await expect(
      createFacilitiesAndUpdateProject(
        { blob: new Blob(["validated"]), filename: "validated.xlsx" },
        "project-1",
        "token-1",
      ),
    ).rejects.toThrow("Row failed");
  });
});
