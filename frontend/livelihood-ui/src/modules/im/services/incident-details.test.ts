/**
 * Unit tests for `incident-details.ts` — the helpers used by the Incident Management
 * module to fetch and shape file-store media (thumbnails/images/videos) attached to an
 * incident's verification documents, and to search for an incident by id.
 *
 * Testing approach:
 * - `getOriginalFileUrl` is a pure string-parsing function, so it is exercised directly
 *   with no mocking.
 * - `fetchFileUrls`, `resolveVerificationMedia`, and `searchIncidentById` all go through
 *   `apiClient` (the shared axios instance), so `apiClient.get`/`apiClient.post` are
 *   spied on with `vi.spyOn` and made to resolve via `mockAxiosSuccess`, which wraps a
 *   payload in an axios-shaped response so callers can destructure `{ data }` as usual.
 * - `vi.restoreAllMocks()` runs after every test so each test's spy/mock is isolated and
 *   does not leak into the next one.
 */
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

// getOriginalFileUrl picks the "full-size" variant out of a comma-separated list of
// filestore URL variants (digit-ui pattern: large/medium/small/original). It returns the
// input unchanged when there is only a single (non-comma) URL.
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

  // Business rule: if none of the comma-separated variants is free of
  // large/medium/small in its path (i.e. no true "original" exists), fall back to the
  // first entry rather than returning undefined/empty.
  it("falls back to the first part when every variant contains large/medium/small", () => {
    const url = [
      "https://cdn.example.com/large/file.jpg",
      "https://cdn.example.com/medium/file.jpg",
    ].join(",");
    expect(getOriginalFileUrl(url)).toBe("https://cdn.example.com/large/file.jpg");
  });
});

// fetchFileUrls resolves filestore URLs for a list of ids via GET
// /filestore/v1/files/url, joining the ids into a single comma-separated query param.
// It short-circuits (no API call) when given an empty id list.
describe("fetchFileUrls", () => {
  // Guards the empty-input short-circuit: an empty fileStoreIds array must not trigger
  // a network call at all, and should resolve to the same empty shape the API would
  // otherwise return.
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

// Test helper: builds a minimal VerificationDocument with sensible defaults so each test
// only needs to override the fields it cares about (fileStoreId/documentUid/documentType).
function buildDoc(overrides: Partial<VerificationDocument> = {}): VerificationDocument {
  return {
    fileStoreId: "fs-1",
    documentUid: "",
    documentType: "image/jpeg",
    additionalDetails: {},
    ...overrides,
  };
}

// resolveVerificationMedia fetches filestore URLs for a set of verification documents
// and buckets each resolved URL into thumbs/images/videos:
// - Videos are grouped by documentUid (falling back to fileStoreId) so an "HLS" master
//   playlist and its "video/*" original file end up as a single { master, original }
//   entry for the same logical video.
// - Everything else with a resolved URL is treated as an image.
// - Thumbnails are derived independently, once per response entry, via getThumbnailUrl.
// Documents with no fileStoreId, or whose fileStoreId has no match in the filestore
// response, are silently skipped.
describe("resolveVerificationMedia", () => {
  // No documents (or none with a fileStoreId) means fetchFileUrls's own empty
  // short-circuit is hit, so the API is never called and all three groups stay empty.
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

  // Business rule: an "HLS" document and a "video/*" document sharing the same
  // documentUid represent the same logical video (streaming master + downloadable
  // original), so they must merge into one { master, original } entry rather than two
  // separate video entries.
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

  // Business rule: video detection must be case-insensitive and must match by prefix
  // (e.g. "Video/MP4"), not just the exact lowercase "video/..." string.
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

  // A document whose fileStoreId is absent from the filestore response's fileStoreIds
  // list must be silently dropped from both images and videos, not throw or produce a
  // placeholder entry.
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

  // getThumbnailUrl picks index 3 of a comma-separated variant list (the expected
  // thumbnail-size slot in the digit-ui convention), falling back to index 0 or the raw
  // string when there are fewer variants. Thumbnails are built from every response
  // entry regardless of image/video classification.
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

// searchIncidentById POSTs to /im-services/v2/request/_search with tenantId and
// incidentId as query params and a RequestInfo body built by createRequestInfo (which
// stamps standard fields like apiId), returning the raw search response data.
describe("searchIncidentById", () => {
  // Verifies both the RequestInfo envelope (built via createRequestInfo, identified here
  // by apiId: "Rainmaker") and the tenantId/incidentId query params are wired through
  // correctly to apiClient.post.
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
