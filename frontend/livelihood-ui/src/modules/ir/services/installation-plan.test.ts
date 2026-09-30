import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient, tenantId } from "@/shared";
import { searchActivityAssignments } from "./installation-plan";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
    tenantId: vi.fn(() => "fallback-tenant"),
  };
});

describe("searchActivityAssignments", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(tenantId).mockReset().mockReturnValue("fallback-tenant");
  });

  it("posts the criteria under ActivityAssignment with default offset/limit", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { ActivityAssignment: [], TotalCount: 0 },
    });
    const criteria = { tenantId: "tenant-1", roles: ["INSTALLATION_REPORT_APPROVER_QC_TEAM"] };

    await searchActivityAssignments(criteria, {}, "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/activity/v1/activities/assignment/_search",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        ActivityAssignment: criteria,
      }),
      { params: { tenantId: "tenant-1", offset: 0, limit: 10 } },
    );
  });

  it("passes explicit limit/offset options through to params", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { ActivityAssignment: [], TotalCount: 0 },
    });
    const criteria = { tenantId: "tenant-1", fieldPlanCode: "FP-1" };

    await searchActivityAssignments(criteria, { limit: 3, offset: 9 }, "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      { params: { tenantId: "tenant-1", offset: 9, limit: 3 } },
    );
  });

  it("falls back to the shared tenantId() when criteria.tenantId is falsy", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { ActivityAssignment: [], TotalCount: 0 },
    });
    const criteria = { tenantId: "" };

    await searchActivityAssignments(criteria, {}, "token-1");

    expect(tenantId).toHaveBeenCalled();
    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      { params: { tenantId: "fallback-tenant", offset: 0, limit: 10 } },
    );
  });

  it("includes userInfo in RequestInfo when a user is provided", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { ActivityAssignment: [], TotalCount: 0 },
    });
    const user = { uuid: "u1", name: "Reviewer" };

    await searchActivityAssignments({ tenantId: "tenant-1" }, {}, "token-1", user);

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as { RequestInfo: Record<string, unknown> };
    expect(body.RequestInfo).toEqual(expect.objectContaining({ userInfo: user }));
  });

  it("returns the raw response data unmodified", async () => {
    const responseData = {
      ActivityAssignment: [{ id: "a1", tenantId: "tenant-1" }],
      TotalCount: 1,
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData });

    const result = await searchActivityAssignments({ tenantId: "tenant-1" }, {}, "token-1");

    expect(result).toEqual(responseData);
    expect(result).toBe(responseData);
  });
});
