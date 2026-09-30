import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/shared";
import { searchInbox } from "./inbox";
import type { IncidentFilterInput } from "../utils/inbox-filters";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
  };
});

describe("searchInbox", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the built inbox criteria, sending tenantId as a param", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { items: [], totalCount: 0 } });
    const jurisdiction = { state: ["s1"] };
    const filters: IncidentFilterInput = {
      limit: 10,
      offset: 5,
      sortBy: "createdTime",
      sortOrder: "DESC",
      applicationNumber: "AB-1",
      services: ["LivelihoodIncident"],
      facility: "F1,F2",
    };

    await searchInbox("tenant-1", jurisdiction, filters, "token-1", { uuid: "u1" });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/inbox/v2/_search",
      {
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        inbox: {
          tenantId: "tenant-1",
          processSearchCriteria: {
            businessService: ["LivelihoodIncident"],
            moduleName: "Incident",
            tenantId: "tenant-1",
          },
          jurisdictionSearchCriteria: jurisdiction,
          moduleSearchCriteria: {
            facility: ["F1", "F2"],
            tenantId: "tenant-1",
            sortBy: "createdTime",
            sortOrder: "DESC",
            applicationNumber: "AB-1",
          },
          limit: 10,
          offset: 5,
        },
      },
      { params: { tenantId: "tenant-1" } },
    );
  });

  it("includes userInfo in RequestInfo when a user is provided, omits it otherwise", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { items: [], totalCount: 0 } });
    const user = { uuid: "u1", name: "Reviewer" };

    await searchInbox("tenant-1", {}, {}, "token-1", user);
    const withUserBody = vi.mocked(apiClient.post).mock.calls[0][1] as {
      RequestInfo: Record<string, unknown>;
    };
    expect(withUserBody.RequestInfo).toEqual(expect.objectContaining({ userInfo: user }));

    vi.mocked(apiClient.post).mockClear();
    await searchInbox("tenant-1", {}, {}, "token-1", null);
    const withoutUserBody = vi.mocked(apiClient.post).mock.calls[0][1] as {
      RequestInfo: Record<string, unknown>;
    };
    expect(withoutUserBody.RequestInfo).not.toHaveProperty("userInfo");
  });

  it("returns the raw response data unmodified", async () => {
    const responseData = { items: [{ businessObject: {} }], totalCount: 1 };
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData });

    const result = await searchInbox("tenant-1", {}, {}, "token-1", null);

    expect(result).toEqual(responseData);
    expect(result).toBe(responseData);
  });
});
