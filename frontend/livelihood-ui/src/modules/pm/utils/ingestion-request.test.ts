import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import {
  extractBlobApiErrorMessage,
  httpStatusOf,
  IngestionRequestError,
  isGuidanceError,
  postJsonExpectingBlob,
  postJsonExpectingJson,
  postMultipartExpectingBlob,
  postMultipartExpectingJson,
} from "./ingestion-request";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } };
});

function makeFile(name = "scope.xlsx") {
  return new File(["data"], name);
}

describe("postMultipartExpectingBlob", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    window.globalConfigs = { getConfig: () => undefined };
  });

  afterEach(() => {
    window.globalConfigs = { getConfig: () => undefined };
  });

  it("posts multipart form data with the file, extra fields, and request_info as a JSON string", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: new Blob(["result"]), headers: {} });

    await postMultipartExpectingBlob(
      "/ingestion-service/template/x",
      { sector: "SOLAR" },
      makeFile(),
      "file",
      "token-1",
      { tenantId: "tenant-1" } as never,
    );

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const [url, body, options] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe("/ingestion-service/template/x");
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("sector")).toBe("SOLAR");
    expect(JSON.parse((body as FormData).get("request_info") as string)).toEqual(
      expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
    );
    expect(options).toMatchObject({
      headers: expect.objectContaining({
        "Content-Type": "multipart/form-data",
        Authorization: "Bearer token-1",
        "auth-token": "token-1",
        tenantId: "tenant-1",
      }),
      params: { tenantId: "tenant-1" },
      responseType: "blob",
    });
  });

  it("reads the error count off the (lowercased) x-error-count response header", async () => {
    const blob = new Blob(["result"]);
    vi.mocked(apiClient.post).mockResolvedValue({ data: blob, headers: { "x-error-count": "3" } });

    const result = await postMultipartExpectingBlob(
      "/x",
      {},
      makeFile(),
      "file",
      "token-1",
      undefined,
    );

    expect(result).toEqual({ blob, errorCount: 3 });
  });

  it("defaults errorCount to 0 when the header is absent", async () => {
    const blob = new Blob(["result"]);
    vi.mocked(apiClient.post).mockResolvedValue({ data: blob, headers: {} });

    const result = await postMultipartExpectingBlob("/x", {}, makeFile(), "file", "token-1", undefined);

    expect(result.errorCount).toBe(0);
  });

  it("falls back to the user's tenantId when present, over the global/env tenant", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: new Blob(), headers: {} });

    await postMultipartExpectingBlob("/x", {}, makeFile(), "file", "token-1", { tenantId: "user-tenant" } as never);

    const options = vi.mocked(apiClient.post).mock.calls[0][2] as { params: { tenantId: string } };
    expect(options.params.tenantId).toBe("user-tenant");
  });
});

describe("postMultipartExpectingJson", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the same shape and returns the parsed JSON body", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "template-1" }, headers: {} });

    const result = await postMultipartExpectingJson<{ id: string }>(
      "/x",
      {},
      makeFile(),
      "file",
      "token-1",
      undefined,
    );

    expect(result).toEqual({ id: "template-1" });
    const options = vi.mocked(apiClient.post).mock.calls[0][2] as { responseType: string };
    expect(options.responseType).toBe("json");
  });
});

describe("isGuidanceError", () => {
  it("returns true for a 4xx status", () => {
    expect(isGuidanceError({ status: 400 })).toBe(true);
    expect(isGuidanceError({ status: 499 })).toBe(true);
  });

  it("returns false for a 5xx status", () => {
    expect(isGuidanceError({ status: 500 })).toBe(false);
  });

  it("returns false when there is no status", () => {
    expect(isGuidanceError({})).toBe(false);
    expect(isGuidanceError(undefined)).toBe(false);
  });
});

describe("httpStatusOf", () => {
  it("reads the response status off an axios-shaped error", () => {
    expect(httpStatusOf({ response: { status: 404 } })).toBe(404);
  });

  it("returns undefined when there is no response", () => {
    expect(httpStatusOf({})).toBeUndefined();
    expect(httpStatusOf(undefined)).toBeUndefined();
  });
});

describe("extractBlobApiErrorMessage", () => {
  it("parses a JSON error body from a Blob and picks the message", async () => {
    const blob = new Blob([JSON.stringify({ Errors: [{ message: "No sites available" }] })]);
    const error = { response: { data: blob } };

    await expect(extractBlobApiErrorMessage(error)).resolves.toBe("No sites available");
  });

  it("returns undefined when the blob isn't valid JSON", async () => {
    const blob = new Blob(["not json"]);
    const error = { response: { data: blob } };

    await expect(extractBlobApiErrorMessage(error)).resolves.toBeUndefined();
  });

  it("returns undefined when the response data isn't a Blob", async () => {
    const error = { response: { data: { message: "x" } } };

    await expect(extractBlobApiErrorMessage(error)).resolves.toBeUndefined();
  });
});

describe("postJsonExpectingBlob", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns the blob and filename on success", async () => {
    const blob = new Blob(["workbook"]);
    vi.mocked(apiClient.post).mockResolvedValue({ data: blob });

    const result = await postJsonExpectingBlob("/x", { sector: "SOLAR" }, "scope.xlsx", "token-1", undefined);

    expect(result).toEqual({ blob, filename: "scope.xlsx" });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/x",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker" }),
        sector: "SOLAR",
      }),
      expect.objectContaining({ responseType: "blob" }),
    );
  });

  it("throws an IngestionRequestError with the server's real message extracted from the blob error body", async () => {
    const errorBlob = new Blob([JSON.stringify({ Errors: [{ message: "No sites available" }] })]);
    vi.mocked(apiClient.post).mockRejectedValue({ response: { data: errorBlob, status: 400 } });

    await expect(
      postJsonExpectingBlob("/x", {}, "scope.xlsx", "token-1", undefined),
    ).rejects.toMatchObject({ message: "No sites available", status: 400 });
  });

  it("re-throws the original error when no message can be extracted", async () => {
    const originalError = { response: { data: new Blob(["not json"]), status: 500 } };
    vi.mocked(apiClient.post).mockRejectedValue(originalError);

    await expect(postJsonExpectingBlob("/x", {}, "scope.xlsx", "token-1", undefined)).rejects.toBe(
      originalError,
    );
  });
});

describe("postJsonExpectingJson", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns the response data on success", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { valid: true } });

    const result = await postJsonExpectingJson("/x", {}, "token-1", undefined);

    expect(result).toEqual({ valid: true });
  });

  it("throws an IngestionRequestError built from the already-parsed JSON error body", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      response: { data: { Errors: [{ message: "Invalid sector" }] }, status: 422 },
    });

    await expect(postJsonExpectingJson("/x", {}, "token-1", undefined)).rejects.toMatchObject({
      message: "Invalid sector",
      status: 422,
    });
  });

  it("re-throws the original error when no message can be picked", async () => {
    const originalError = { response: { data: {}, status: 500 } };
    vi.mocked(apiClient.post).mockRejectedValue(originalError);

    await expect(postJsonExpectingJson("/x", {}, "token-1", undefined)).rejects.toBe(originalError);
  });
});

describe("IngestionRequestError", () => {
  it("carries the message, name, and status", () => {
    const error = new IngestionRequestError("Something needs fixing", 400);

    expect(error.message).toBe("Something needs fixing");
    expect(error.name).toBe("IngestionRequestError");
    expect(error.status).toBe(400);
    expect(error).toBeInstanceOf(Error);
  });
});
