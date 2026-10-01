import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, i18n } from "@/shared";
import {
  createSolutionTemplate,
  downloadSolutionTemplate,
  InstallationTemplateApiError,
  searchFieldPlanTemplateSolutionIds,
  validateSolutionTemplate,
} from "./installation-template";

// i18n isn't initialized in tests, so i18n.t() returns undefined for any key rather than
// echoing the key back the way real i18next does once loaded — stub it to match production.
beforeEach(() => {
  vi.spyOn(i18n, "t").mockImplementation(((key: string) => key) as typeof i18n.t);
});

afterEach(() => {
  vi.restoreAllMocks();
});

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } };
});

describe("downloadSolutionTemplate", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts snake_case fieldplan_id/solution_code and returns the blob with a derived filename", async () => {
    const blob = new Blob(["workbook"]);
    vi.mocked(apiClient.post).mockResolvedValue({ data: blob });

    const result = await downloadSolutionTemplate("plan-1", "SOLAR", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/ingestion-service/template/installationTemplate",
      expect.objectContaining({ fieldplan_id: "plan-1", solution_code: "SOLAR" }),
      expect.objectContaining({ responseType: "blob" }),
    );
    expect(result).toEqual({ blob, filename: "installation-template-SOLAR-plan-1.xlsx" });
  });
});

describe("validateSolutionTemplate", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns the annotated blob and error count on success", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: new Blob(["annotated"]), headers: { "x-error-count": "2" } });

    const result = await validateSolutionTemplate(new File(["x"], "t.xlsx"), "plan-1", "SOLAR", "token-1");

    expect(result.errorCount).toBe(2);
    expect(result.file.filename).toBe("installation-template-validated-t.xlsx");
  });

  it("throws InstallationTemplateApiError with the extracted server message on failure", async () => {
    const errorBlob = new Blob([JSON.stringify({ Errors: [{ message: "Quantity is required" }] })]);
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: errorBlob, status: 400 } });

    await expect(
      validateSolutionTemplate(new File(["x"], "t.xlsx"), "plan-1", "SOLAR", "token-1"),
    ).rejects.toMatchObject({ message: "Quantity is required", status: 400 });
  });

  it("falls back to a translated default message when no server message can be extracted", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: new Blob(["not json"]), status: 500 } });

    await expect(
      validateSolutionTemplate(new File(["x"], "t.xlsx"), "plan-1", "SOLAR", "token-1"),
    ).rejects.toThrow("IC report template validation failed");
  });

  it("rejects with an InstallationTemplateApiError instance", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: new Blob(["x"]), status: 500 } });

    await expect(
      validateSolutionTemplate(new File(["x"], "t.xlsx"), "plan-1", "SOLAR", "token-1"),
    ).rejects.toBeInstanceOf(InstallationTemplateApiError);
  });
});

describe("createSolutionTemplate", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns true when the response carries a message", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: "Template created" } });

    const result = await createSolutionTemplate(
      "plan-1",
      "SOLAR",
      { blob: new Blob(["x"]), filename: "validated.xlsx" },
      "token-1",
    );

    expect(result).toBe(true);
  });

  it("returns false when the response has no message", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    const result = await createSolutionTemplate(
      "plan-1",
      "SOLAR",
      { blob: new Blob(["x"]), filename: "validated.xlsx" },
      "token-1",
    );

    expect(result).toBe(false);
  });

  it("throws InstallationTemplateApiError on a failed request", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: { error: { message: "Bad file" } }, status: 400 } });

    await expect(
      createSolutionTemplate("plan-1", "SOLAR", { blob: new Blob(["x"]), filename: "validated.xlsx" }, "token-1"),
    ).rejects.toMatchObject({ message: "Bad file", status: 400 });
  });
});

describe("searchFieldPlanTemplateSolutionIds", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("reads the plural FieldPlanTemplates key and returns a Set of solutionIds", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { FieldPlanTemplates: [{ solutionId: "SOLAR" }, { solutionId: "MACHINE" }] },
    });

    const result = await searchFieldPlanTemplateSolutionIds("plan-1", "token-1");

    expect(result).toEqual(new Set(["SOLAR", "MACHINE"]));
  });

  it("returns an empty Set when the response has no templates", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    const result = await searchFieldPlanTemplateSolutionIds("plan-1", "token-1");

    expect(result).toEqual(new Set());
  });

  it("filters out entries with no solutionId", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { FieldPlanTemplates: [{ solutionId: "SOLAR" }, {}] },
    });

    const result = await searchFieldPlanTemplateSolutionIds("plan-1", "token-1");

    expect(result).toEqual(new Set(["SOLAR"]));
  });
});
