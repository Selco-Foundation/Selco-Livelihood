import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { fetchFileUrls } from "./filestore";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}));

describe("fetchFileUrls", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("returns an empty list without calling the API when fileStoreIds is empty", async () => {
    const result = await fetchFileUrls([], "tenant-1", "token-1");

    expect(apiClient.get).not.toHaveBeenCalled();
    expect(result).toEqual({ fileStoreIds: [] });
  });

  it("gets the file urls with tenantId and comma-joined fileStoreIds as params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { fileStoreIds: [] } });

    await fetchFileUrls(["fs1", "fs2"], "tenant-1", "token-1");

    expect(apiClient.get).toHaveBeenCalledWith("/filestore/v1/files/url", {
      params: { tenantId: "tenant-1", fileStoreIds: "fs1,fs2" },
    });
  });

  it("keeps only the first comma-joined url segment for each entry (egov-filestore thumbnail concatenation)", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        fileStoreIds: [
          {
            id: "fs1",
            url: "https://host/original?sig=a,https://host/large?sig=b,https://host/medium?sig=c",
          },
          { id: "fs2", url: "https://host/single-file?sig=d" },
        ],
      },
    });

    const result = await fetchFileUrls(["fs1", "fs2"], "tenant-1", "token-1");

    expect(result.fileStoreIds).toEqual([
      { id: "fs1", url: "https://host/original?sig=a" },
      { id: "fs2", url: "https://host/single-file?sig=d" },
    ]);
  });

  it("leaves an entry's url undefined when the response entry has no url", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { fileStoreIds: [{ id: "fs1" }] } });

    const result = await fetchFileUrls(["fs1"], "tenant-1", "token-1");

    expect(result.fileStoreIds).toEqual([{ id: "fs1", url: undefined }]);
  });

  it("defaults fileStoreIds to an empty array when the response omits it", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });

    const result = await fetchFileUrls(["fs1"], "tenant-1", "token-1");

    expect(result).toEqual({ fileStoreIds: [] });
  });
});
