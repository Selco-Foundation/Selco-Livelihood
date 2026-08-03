/**
 * Unit tests for `searchInbox` (src/modules/im/services/inbox.ts).
 *
 * `searchInbox` is a thin API wrapper: it delegates filter normalization to
 * `buildIncidentInboxFilters`, assembles the `POST /inbox/v2/_search` request
 * body (RequestInfo + inbox criteria), and returns the raw response data.
 * Because there is no component/DOM involved, the only thing worth testing
 * is the shape of the outgoing payload and the pass-through of the response.
 *
 * Mocking strategy: `apiClient.post` is spied on with `vi.spyOn` and stubbed
 * to resolve with `mockAxiosSuccess`, which wraps a payload in an
 * axios-response-shaped object so `const { data } = await apiClient.post(...)`
 * in the source works unchanged. No router/i18n/provider wrappers are needed
 * since this module has no React/UI surface.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { searchInbox } from "./inbox";

afterEach(() => {
  // Restore the apiClient.post spy after each test so mocked behavior from
  // one test never leaks into the next.
  vi.restoreAllMocks();
});

// searchInbox(tenantId, jurisdictionBoundaries, filters, accessToken, user):
// runs the raw filters through buildIncidentInboxFilters, packages the result
// into the { inbox: { ... } } payload expected by the search endpoint (adding
// tenantId, jurisdictionSearchCriteria, sort/applicationNumber under
// moduleSearchCriteria, and limit/offset), POSTs it with a generated
// RequestInfo, and returns response.data as-is.
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

  // Confirms searchInbox unwraps and returns response.data verbatim rather
  // than the full axios response envelope, regardless of the request inputs.
  it("returns the response data", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ items: [], totalCount: 5 }),
    );

    const result = await searchInbox("livelihood", {}, {}, "token", null);

    expect(result).toEqual({ items: [], totalCount: 5 });
  });
});
