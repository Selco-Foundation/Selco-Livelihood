import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient, tenantId } from "@/shared";
import {
  bulkUpdateActivityFacilitiesWorkflow,
  searchActivityFacilities,
} from "./facility";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
    tenantId: vi.fn(() => "fallback-tenant"),
  };
});

describe("searchActivityFacilities", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(tenantId).mockReset().mockReturnValue("fallback-tenant");
  });

  it("posts the criteria under ActivityFacility with default offset/limit", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { totalCount: 0, facility: [] } });
    const criteria = { tenantId: "tenant-1", ids: ["f1"] };

    await searchActivityFacilities(criteria, {}, "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/activity/v1/activities/_search",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        ActivityFacility: criteria,
      }),
      { params: { tenantId: "tenant-1", offset: 0, limit: 10 } },
    );
  });

  it("passes explicit limit/offset options through to params", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { totalCount: 0, facility: [] } });
    const criteria = { tenantId: "tenant-1" };

    await searchActivityFacilities(criteria, { limit: 5, offset: 20 }, "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      { params: { tenantId: "tenant-1", offset: 20, limit: 5 } },
    );
  });

  it("falls back to the shared tenantId() when criteria.tenantId is falsy", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { totalCount: 0, facility: [] } });
    const criteria = { tenantId: "" };

    await searchActivityFacilities(criteria, {}, "token-1");

    expect(tenantId).toHaveBeenCalled();
    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      { params: { tenantId: "fallback-tenant", offset: 0, limit: 10 } },
    );
  });

  it("returns the raw response data unmodified", async () => {
    const responseData = { totalCount: 2, facility: [{ activityFacility: { id: "f1" } }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData });

    const result = await searchActivityFacilities({ tenantId: "tenant-1" }, {}, "token-1");

    expect(result).toEqual(responseData);
    expect(result).toBe(responseData);
  });
});

describe("bulkUpdateActivityFacilitiesWorkflow", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the spread criteria alongside RequestInfo, and tenantId as a param", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      status: 200,
      data: { succeededProjectIDs: ["f1"], failedProjectIDs: [] },
    });
    const criteria = {
      workflow: { action: "APPROVE", comments: "bulk approve" },
      isAllSelected: false,
      activityFacilityIds: ["f1", "f2"],
    };

    await bulkUpdateActivityFacilitiesWorkflow(criteria, "tenant-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/activity/v1/activities/bulk/workflow/update",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        workflow: criteria.workflow,
        isAllSelected: false,
        activityFacilityIds: ["f1", "f2"],
      }),
      { params: { tenantId: "tenant-1" } },
    );
  });

  it("omits activityFacilityIds from the body when not provided", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      status: 200,
      data: { succeededProjectIDs: [], failedProjectIDs: [] },
    });
    const criteria = {
      workflow: { action: "REJECT", comments: "bulk reject" },
      isAllSelected: false,
    };

    await bulkUpdateActivityFacilitiesWorkflow(criteria, "tenant-1", "token-1");

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("activityFacilityIds");
  });

  it("returns the status and raw data from the response, unmodified", async () => {
    const data = { succeededProjectIDs: ["f1"], failedProjectIDs: ["f2"] };
    vi.mocked(apiClient.post).mockResolvedValue({ status: 207, data });
    const criteria = {
      workflow: { action: "APPROVE", comments: "bulk approve" },
      isAllSelected: false,
      activityFacilityIds: ["f1", "f2"],
    };

    const result = await bulkUpdateActivityFacilitiesWorkflow(criteria, "tenant-1", "token-1");

    expect(result).toEqual({ status: 207, data });
    expect(result.data).toBe(data);
  });
});
