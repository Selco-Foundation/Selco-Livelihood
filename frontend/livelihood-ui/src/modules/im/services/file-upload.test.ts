import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { buildFile } from "@/test/mocks/file";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { uploadIncidentFile, uploadIncidentVideo } from "./file-upload";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("uploadIncidentFile", () => {
  it("returns the fileStoreId/masterFileStoreId on success", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ files: [{ fileStoreId: "fs-1", masterFileStoreId: "fs-master" }] }),
    );

    const result = await uploadIncidentFile(buildFile("photo.jpg", 10, "image/jpeg"), "livelihood", "token");

    expect(result).toEqual({ fileStoreId: "fs-1", masterFileStoreId: "fs-master" });
  });

  it("throws FILE_UPLOAD_FAILED when the response has no fileStoreId", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ files: [] }));

    await expect(
      uploadIncidentFile(buildFile("photo.jpg", 10, "image/jpeg"), "livelihood", "token"),
    ).rejects.toThrow("FILE_UPLOAD_FAILED");
  });

  it("sends the file as multipart form data with a Bearer auth header", async () => {
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockReturnValue(mockAxiosSuccess({ files: [{ fileStoreId: "fs-1" }] }));

    await uploadIncidentFile(buildFile("photo.jpg", 10, "image/jpeg"), "livelihood", "token-1");

    const [, body, config] = postSpy.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);
    expect(config?.headers?.Authorization).toBe("Bearer token-1");
  });
});

describe("uploadIncidentVideo", () => {
  it("returns the fileStoreId/masterFileStoreId on success", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ files: [{ fileStoreId: "fs-video" }] }),
    );

    const result = await uploadIncidentVideo(buildFile("clip.mp4", 10, "video/mp4"), "livelihood", "token");

    expect(result).toEqual({ fileStoreId: "fs-video", masterFileStoreId: undefined });
  });

  it("throws VIDEO_UPLOAD_FAILED when the response has no fileStoreId", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ files: [] }));

    await expect(
      uploadIncidentVideo(buildFile("clip.mp4", 10, "video/mp4"), "livelihood", "token"),
    ).rejects.toThrow("VIDEO_UPLOAD_FAILED");
  });

  it("posts to the video upload endpoint with an extended timeout", async () => {
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockReturnValue(mockAxiosSuccess({ files: [{ fileStoreId: "fs-video" }] }));

    await uploadIncidentVideo(buildFile("clip.mp4", 10, "video/mp4"), "livelihood", "token");

    expect(postSpy).toHaveBeenCalledWith(
      "/im-services/v2/video/upload",
      expect.any(FormData),
      expect.objectContaining({ timeout: 600_000 }),
    );
  });
});
