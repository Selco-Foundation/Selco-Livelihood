/**
 * Unit tests for file-upload.ts, the two thin API-wrapper functions used by the
 * Incident module to upload a photo/file and a video to the filestore service.
 *
 * Testing approach: `apiClient.post` (an axios instance) is spied on with
 * `vi.spyOn` and stubbed via `mockAxiosSuccess`, which wraps a fake filestore
 * response body in an axios-shaped `{ data }` object. This avoids any real
 * network/multipart handling while still letting us assert on:
 *   - the resolved value each function returns (fileStoreId/masterFileStoreId
 *     mapping from `data.files[0]`),
 *   - the error path when the filestore responds with no files/fileStoreId,
 *   - and the exact request shape (FormData body, headers, timeout) passed
 *     to `apiClient.post`, by inspecting the spy's recorded call arguments.
 * `buildFile` produces a real `File` instance so `FormData.append` behaves
 * as it would in the browser. Mocks are restored after each test so the
 * spy on `apiClient.post` doesn't leak between test cases.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { buildFile } from "@/test/mocks/file";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { uploadIncidentFile, uploadIncidentVideo } from "./file-upload";

afterEach(() => {
  vi.restoreAllMocks();
});

// uploadIncidentFile: builds multipart FormData (file + tenantId + module="Incident")
// and POSTs it to /filestore/v1/files with a Bearer auth header. On success it maps
// the first entry of `data.files` to { fileStoreId, masterFileStoreId }; if that
// entry is missing or has no fileStoreId, it throws "FILE_UPLOAD_FAILED".
describe("uploadIncidentFile", () => {
  it("returns the fileStoreId/masterFileStoreId on success", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ files: [{ fileStoreId: "fs-1", masterFileStoreId: "fs-master" }] }),
    );

    const result = await uploadIncidentFile(buildFile("photo.jpg", 10, "image/jpeg"), "livelihood", "token");

    expect(result).toEqual({ fileStoreId: "fs-1", masterFileStoreId: "fs-master" });
  });

  // An empty `files` array means `data.files?.[0]` is undefined, so `uploaded?.fileStoreId`
  // is falsy and the function must throw rather than return a malformed result.
  it("throws FILE_UPLOAD_FAILED when the response has no fileStoreId", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ files: [] }));

    await expect(
      uploadIncidentFile(buildFile("photo.jpg", 10, "image/jpeg"), "livelihood", "token"),
    ).rejects.toThrow("FILE_UPLOAD_FAILED");
  });

  // Verifies the request itself (not just the return value): the body must be a
  // FormData instance (multipart upload) and the Authorization header must carry
  // the token passed in as `accessToken`, formatted as a Bearer token.
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

// uploadIncidentVideo: same shape as uploadIncidentFile but POSTs multipart FormData
// to /im-services/v2/video/upload with a much longer timeout (600s) since video
// uploads are larger/slower. On success it maps `data.files[0]` to
// { fileStoreId, masterFileStoreId }; a missing/empty `files` array throws
// "VIDEO_UPLOAD_FAILED" instead.
describe("uploadIncidentVideo", () => {
  it("returns the fileStoreId/masterFileStoreId on success", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ files: [{ fileStoreId: "fs-video" }] }),
    );

    const result = await uploadIncidentVideo(buildFile("clip.mp4", 10, "video/mp4"), "livelihood", "token");

    // masterFileStoreId is optional in the response; when the mock omits it,
    // the mapped result should carry it through as `undefined` rather than
    // being dropped from the shape.
    expect(result).toEqual({ fileStoreId: "fs-video", masterFileStoreId: undefined });
  });

  // Mirrors the "no fileStoreId" failure path for the file upload above: an
  // empty `files` array leaves `uploaded` undefined, so the function must
  // throw VIDEO_UPLOAD_FAILED rather than return an incomplete result.
  it("throws VIDEO_UPLOAD_FAILED when the response has no fileStoreId", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ files: [] }));

    await expect(
      uploadIncidentVideo(buildFile("clip.mp4", 10, "video/mp4"), "livelihood", "token"),
    ).rejects.toThrow("VIDEO_UPLOAD_FAILED");
  });

  // Video uploads use a 600_000ms (10 minute) timeout instead of axios's default,
  // to tolerate large file transfers; this asserts that config is actually wired
  // into the request rather than only documented.
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
