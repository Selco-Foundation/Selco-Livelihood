import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { fetchAllPages, postSearch, searchUrlParams, BULK_PAGE_SIZE } from "./url-params";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } };
});

describe("searchUrlParams", () => {
  beforeEach(() => {
    window.globalConfigs = { getConfig: () => undefined };
  });

  afterEach(() => {
    window.globalConfigs = { getConfig: () => undefined };
  });

  it("uses the user's tenantId when present", () => {
    expect(searchUrlParams({ tenantId: "tenant-1" } as never, { limit: 10 })).toEqual({
      tenantId: "tenant-1",
      limit: 10,
      offset: 0,
    });
  });

  it("falls back to the state-level tenant when the user has none", () => {
    window.globalConfigs = { getConfig: (key: string) => (key === "STATE_LEVEL_TENANT_ID" ? "livelihood" : undefined) };
    expect(searchUrlParams(undefined, { limit: 5, offset: 20 })).toEqual({
      tenantId: "livelihood",
      limit: 5,
      offset: 20,
    });
  });

  it("defaults offset to 0 when not provided", () => {
    expect(searchUrlParams({ tenantId: "tenant-1" } as never, { limit: 10 }).offset).toBe(0);
  });
});

describe("fetchAllPages", () => {
  it("stops as soon as a page comes back shorter than the page size", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(Array.from({ length: 3 }, (_, i) => i))
      .mockResolvedValueOnce([99]);

    const rows = await fetchAllPages(fetchPage, 3);

    expect(rows).toEqual([0, 1, 2, 99]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 3, 0);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 3, 3);
  });

  it("returns a single page's rows when it is already short of a full page", async () => {
    const fetchPage = vi.fn().mockResolvedValue([1, 2]);

    const rows = await fetchAllPages(fetchPage, 5);

    expect(rows).toEqual([1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("defaults the page size to BULK_PAGE_SIZE", async () => {
    const fetchPage = vi.fn().mockResolvedValue([]);

    await fetchAllPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledWith(BULK_PAGE_SIZE, 0);
  });

  it("stops after MAX_PAGES even if every page is full (runaway guard)", async () => {
    const fetchPage = vi.fn().mockResolvedValue(Array.from({ length: 2 }, (_, i) => i));

    const rows = await fetchAllPages(fetchPage, 2);

    expect(fetchPage).toHaveBeenCalledTimes(200);
    expect(rows).toHaveLength(400);
  });
});

describe("postSearch", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    window.globalConfigs = { getConfig: () => undefined };
  });

  it("posts RequestInfo plus the criteria under the given body key, with default limit/offset", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { rows: [] } });

    await postSearch("/service/_search", "Project", { name: "Foo" }, { accessToken: "token-1" });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/service/_search",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        Project: { name: "Foo" },
      }),
      { params: expect.objectContaining({ limit: 10, offset: 0 }) },
    );
  });

  it("merges extraParams into the query string alongside tenantId/limit/offset", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    await postSearch(
      "/service/_search",
      "Project",
      {},
      { accessToken: "token-1", extraParams: { includeDeleted: true } },
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      { params: expect.objectContaining({ includeDeleted: true }) },
    );
  });

  it("returns the raw response data unmodified", async () => {
    const responseData = { Project: [{ id: "p1" }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData });

    const result = await postSearch("/service/_search", "Project", {}, {});

    expect(result).toBe(responseData);
  });

  it("respects explicit limit/offset options", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    await postSearch("/service/_search", "Project", {}, { limit: 25, offset: 50 });

    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      { params: expect.objectContaining({ limit: 25, offset: 50 }) },
    );
  });
});
