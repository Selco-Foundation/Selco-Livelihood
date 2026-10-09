import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, tenantId } from "@/shared";
import { downloadBoundaryTemplate, downloadFacilityTemplate, uploadBoundaryData } from "./ingestion";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } };
});

function jsonBlob(body: unknown): Blob {
  return new Blob([JSON.stringify(body)], { type: "application/json" });
}

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
  // jsdom's own createObjectURL throws on a plain `new Blob()` — only
  // downloadFacilityTemplate's success path (which calls downloadBlob) needs these stubbed.
  window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
  window.URL.revokeObjectURL = vi.fn();
});

describe("resolveBlobErrorBody (via downloadBoundaryTemplate)", () => {
  it("parses a Blob-shaped JSON error body in place so extractApiErrorMessage can read it", async () => {
    const error = {
      response: {
        data: jsonBlob({ Errors: [{ message: "Template not found" }] }),
        headers: { "content-type": "application/json" },
      },
    };
    vi.mocked(apiClient.post).mockRejectedValue(error);

    await expect(downloadBoundaryTemplate("token-1")).rejects.toBe(error);

    expect(error.response.data).toEqual({ Errors: [{ message: "Template not found" }] });
  });

  it("leaves a non-JSON Blob error body untouched", async () => {
    const blob = new Blob(["not json"], { type: "application/octet-stream" });
    const error = {
      response: { data: blob, headers: { "content-type": "application/octet-stream" } },
    };
    vi.mocked(apiClient.post).mockRejectedValue(error);

    await expect(downloadBoundaryTemplate("token-1")).rejects.toBe(error);

    expect(error.response.data).toBe(blob);
  });
});

describe("downloadFacilityTemplate", () => {
  it("sends request_info as a multipart form field with the gateway's auth-token/tenantId header and query param workaround", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ headers: {}, data: new Blob() });

    await downloadFacilityTemplate("token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/ingestion-service/template/facilityIngestion",
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({ "auth-token": "token-1", tenantId: tenantId() }),
        params: { tenantId: tenantId() },
      }),
    );
    const formData = vi.mocked(apiClient.post).mock.calls[0][1] as FormData;
    expect(JSON.parse(formData.get("request_info") as string)).toMatchObject({ apiId: "Rainmaker" });
  });
});

describe("uploadBoundaryData", () => {
  it("reports failed rows via errorCount when the backend answers with a JSON ack and no annotated workbook", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      headers: { "content-type": "application/json", "x-error-count": "3" },
      data: { status: "success" },
    });

    const result = await uploadBoundaryData(new File(["x"], "boundaries.csv"), "token-1");

    expect(result).toEqual({ success: false, errorCount: 3 });
  });

  it("reports success with no errorCount field when the JSON ack carries no error count", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      headers: { "content-type": "application/json" },
      data: { status: "success" },
    });

    const result = await uploadBoundaryData(new File(["x"], "boundaries.csv"), "token-1");

    expect(result).toEqual({ success: true });
  });

  it("sends the gateway's auth-token/tenantId header and query param workaround", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ headers: {}, data: new Blob() });

    await uploadBoundaryData(new File(["x"], "boundaries.csv"), "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/ingestion-service/ingest/boundaries",
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({ "auth-token": "token-1", tenantId: tenantId() }),
        params: { tenantId: tenantId() },
      }),
    );
  });
});
