import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/shared";
import { uploadIncidentFile, uploadIncidentVideo } from "./file-upload";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
  };
});

function getPostedFormData(callIndex = 0) {
  return vi.mocked(apiClient.post).mock.calls[callIndex][1] as FormData;
}

describe("uploadIncidentFile", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts a multipart form with the file, tenantId and module to /filestore/v1/files", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { files: [{ fileStoreId: "fs1", masterFileStoreId: "mfs1" }] },
    });
    const file = new File(["content"], "photo.png", { type: "image/png" });

    await uploadIncidentFile(file, "tenant-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/filestore/v1/files",
      expect.any(FormData),
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: "Bearer token-1",
        },
      },
    );
    const body = getPostedFormData();
    const postedFile = body.get("file") as File;
    expect(postedFile.name).toBe(file.name);
    expect(postedFile.type).toBe(file.type);
    expect(body.get("tenantId")).toBe("tenant-1");
    expect(body.get("module")).toBe("Incident");
  });

  it("returns the fileStoreId and masterFileStoreId from the first uploaded file", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { files: [{ fileStoreId: "fs1", masterFileStoreId: "mfs1" }] },
    });
    const file = new File(["content"], "photo.png", { type: "image/png" });

    const result = await uploadIncidentFile(file, "tenant-1", "token-1");

    expect(result).toEqual({ fileStoreId: "fs1", masterFileStoreId: "mfs1" });
  });

  it("throws FILE_UPLOAD_FAILED when no file with a fileStoreId comes back", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { files: [] } });
    const file = new File(["content"], "photo.png", { type: "image/png" });

    await expect(uploadIncidentFile(file, "tenant-1", "token-1")).rejects.toThrow(
      "FILE_UPLOAD_FAILED",
    );
  });
});

describe("uploadIncidentVideo", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts a multipart form with a 10 minute timeout to /im-services/v2/video/upload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { files: [{ fileStoreId: "fs2", masterFileStoreId: "mfs2" }] },
    });
    const file = new File(["content"], "clip.mp4", { type: "video/mp4" });

    await uploadIncidentVideo(file, "tenant-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/im-services/v2/video/upload",
      expect.any(FormData),
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: "Bearer token-1",
        },
        timeout: 600_000,
      },
    );
    const body = getPostedFormData();
    const postedFile = body.get("file") as File;
    expect(postedFile.name).toBe(file.name);
    expect(postedFile.type).toBe(file.type);
    expect(body.get("tenantId")).toBe("tenant-1");
    expect(body.get("module")).toBe("Incident");
  });

  it("returns the fileStoreId and masterFileStoreId from the first uploaded file", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { files: [{ fileStoreId: "fs2", masterFileStoreId: "mfs2" }] },
    });
    const file = new File(["content"], "clip.mp4", { type: "video/mp4" });

    const result = await uploadIncidentVideo(file, "tenant-1", "token-1");

    expect(result).toEqual({ fileStoreId: "fs2", masterFileStoreId: "mfs2" });
  });

  it("throws VIDEO_UPLOAD_FAILED when no file with a fileStoreId comes back", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const file = new File(["content"], "clip.mp4", { type: "video/mp4" });

    await expect(uploadIncidentVideo(file, "tenant-1", "token-1")).rejects.toThrow(
      "VIDEO_UPLOAD_FAILED",
    );
  });
});
