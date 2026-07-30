import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { searchInbox } from "./inbox";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("searchInbox", () => {
  it("assembles the inbox payload from the built filters and jurisdiction", async () => {
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockReturnValue(mockAxiosSuccess({ items: [], totalCount: 0 }));

    await searchInbox(
      "livelihood",
      { state: ["S1"] },
      { state: "S1", limit: 10, offset: 0, sortBy: "createdTime", sortOrder: "DESC" },
      "token",
      null,
    );

    expect(postSpy).toHaveBeenCalledWith(
      "/inbox/v2/_search",
      expect.objectContaining({
        inbox: expect.objectContaining({
          tenantId: "livelihood",
          jurisdictionSearchCriteria: { state: ["S1"] },
          limit: 10,
          offset: 0,
          moduleSearchCriteria: expect.objectContaining({
            state: ["S1"],
            sortBy: "createdTime",
            sortOrder: "DESC",
          }),
        }),
      }),
      expect.objectContaining({ params: { tenantId: "livelihood" } }),
    );
  });

  it("returns the response data", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ items: [], totalCount: 5 }),
    );

    const result = await searchInbox("livelihood", {}, {}, "token", null);

    expect(result).toEqual({ items: [], totalCount: 5 });
  });
});
