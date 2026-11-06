import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./client";
import { postSearch, searchUrlParams } from "./search";

vi.mock("./client", () => ({ apiClient: { post: vi.fn(), get: vi.fn() } }));

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
