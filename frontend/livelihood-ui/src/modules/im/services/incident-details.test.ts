import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import type { VerificationDocument } from "../types/create-incident";
import {
  fetchFileUrls,
  getOriginalFileUrl,
  resolveVerificationMedia,
  searchIncidentById,
} from "./incident-details";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getOriginalFileUrl", () => {
  it("returns the url unchanged when it has no comma-separated variants", () => {
    expect(getOriginalFileUrl("https://cdn.example.com/file.jpg")).toBe(
      "https://cdn.example.com/file.jpg",
    );
  });

  it("picks the variant without large/medium/small in its path", () => {
    const url = [
      "https://cdn.example.com/large/file.jpg",
      "https://cdn.example.com/medium/file.jpg",
      "https://cdn.example.com/small/file.jpg",
      "https://cdn.example.com/file.jpg",
    ].join(",");
    expect(getOriginalFileUrl(url)).toBe("https://cdn.example.com/file.jpg");
  });

  it("falls back to the first part when every variant contains large/medium/small", () => {
    const url = [
      "https://cdn.example.com/large/file.jpg",
      "https://cdn.example.com/medium/file.jpg",
    ].join(",");
    expect(getOriginalFileUrl(url)).toBe("https://cdn.example.com/large/file.jpg");
  });
});

describe("fetchFileUrls", () => {
  it("returns an empty result without calling the API when fileStoreIds is empty", async () => {
    const getSpy = vi.spyOn(apiClient, "get");
    const result = await fetchFileUrls([], "livelihood", "token");
    expect(result).toEqual({ fileStoreIds: [] });
    expect(getSpy).not.toHaveBeenCalled();
  });

  it("joins fileStoreIds with a comma and returns the response data", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockReturnValue(mockAxiosSuccess({ fileStoreIds: [{ id: "f1", url: "u1" }] }));

    const result = await fetchFileUrls(["f1", "f2"], "livelihood", "token");

    expect(result).toEqual({ fileStoreIds: [{ id: "f1", url: "u1" }] });
    expect(getSpy).toHaveBeenCalledWith(
      "/filestore/v1/files/url",
      expect.objectContaining({ params: { tenantId: "livelihood", fileStoreIds: "f1,f2" } }),
    );
  });
});

function buildDoc(overrides: Partial<VerificationDocument> = {}): VerificationDocument {
  return {
    fileStoreId: "fs-1",
    documentUid: "",
    documentType: "image/jpeg",
    additionalDetails: {},
    ...overrides,
  };
}

describe("resolveVerificationMedia", () => {
  it("returns empty groups when there are no documents with a fileStoreId", async () => {
    const result = await resolveVerificationMedia([], "livelihood", "token");
    expect(result).toEqual({ thumbs: [], images: [], videos: [] });
  });

  it("classifies an image document into images", async () => {
    vi.spyOn(apiClient, "get").mockReturnValue(
      mockAxiosSuccess({ fileStoreIds: [{ id: "fs-1", url: "https://cdn/img.jpg" }] }),
    );
    const result = await resolveVerificationMedia(
      [buildDoc({ fileStoreId: "fs-1", documentType: "image/jpeg" })],
      "livelihood",
      "token",
    );
    expect(result.images).toEqual(["https://cdn/img.jpg"]);
    expect(result.videos).toEqual([]);
  });

  it("groups an HLS master and its video original under the same documentUid", async () => {
    vi.spyOn(apiClient, "get").mockReturnValue(
      mockAxiosSuccess({
        fileStoreIds: [
          { id: "fs-master", url: "https://cdn/master.m3u8" },
          { id: "fs-video", url: "https://cdn/video.mp4" },
        ],
      }),
    );
    const result = await resolveVerificationMedia(
      [
        buildDoc({ fileStoreId: "fs-master", documentUid: "video1", documentType: "HLS" }),
        buildDoc({ fileStoreId: "fs-video", documentUid: "video1", documentType: "video/mp4" }),
      ],
      "livelihood",
      "token",
    );
    expect(result.videos).toEqual([
      { master: "https://cdn/master.m3u8", original: "https://cdn/video.mp4" },
    ]);
    expect(result.images).toEqual([]);
  });

  it("detects a video via a documentType that starts with 'video' (case-insensitive)", async () => {
    vi.spyOn(apiClient, "get").mockReturnValue(
      mockAxiosSuccess({ fileStoreIds: [{ id: "fs-1", url: "https://cdn/clip.mp4" }] }),
    );
    const result = await resolveVerificationMedia(
      [buildDoc({ fileStoreId: "fs-1", documentUid: "", documentType: "Video/MP4" })],
      "livelihood",
      "token",
    );
    expect(result.videos).toHaveLength(1);
  });

  it("skips documents whose fileStoreId has no matching url in the response", async () => {
    vi.spyOn(apiClient, "get").mockReturnValue(mockAxiosSuccess({ fileStoreIds: [] }));
    const result = await resolveVerificationMedia(
      [buildDoc({ fileStoreId: "fs-missing" })],
      "livelihood",
      "token",
    );
    expect(result.images).toEqual([]);
    expect(result.videos).toEqual([]);
  });

  it("builds thumbnails from every returned fileStoreId url", async () => {
    vi.spyOn(apiClient, "get").mockReturnValue(
      mockAxiosSuccess({
        fileStoreIds: [{ id: "fs-1", url: "a,b,c,thumb-variant" }],
      }),
    );
    const result = await resolveVerificationMedia(
      [buildDoc({ fileStoreId: "fs-1" })],
      "livelihood",
      "token",
    );
    expect(result.thumbs).toEqual(["thumb-variant"]);
  });
});

describe("searchIncidentById", () => {
  it("calls the im-services search endpoint with tenantId/incidentId params", async () => {
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockReturnValue(mockAxiosSuccess({ IncidentWrappers: [] }));

    const result = await searchIncidentById("livelihood", "INC-1", "token");

    expect(result).toEqual({ IncidentWrappers: [] });
    expect(postSpy).toHaveBeenCalledWith(
      "/im-services/v2/request/_search",
      expect.objectContaining({ RequestInfo: expect.objectContaining({ apiId: "Rainmaker" }) }),
      expect.objectContaining({ params: { tenantId: "livelihood", incidentId: "INC-1" } }),
    );
  });
});
