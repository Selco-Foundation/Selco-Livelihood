import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import {
  assignInstallationReviewer,
  createInstallationPlan,
  publishInstallationPlan,
  searchAssignedReviewer,
  searchInstallationPlans,
  updateInstallationPlan,
} from "./installation-plan";
import type { InstallationPlan } from "../types/installation-plan";

vi.mock("@/shared/api/client", () => ({ apiClient: { post: vi.fn(), get: vi.fn() } }));

function plan(overrides: Partial<InstallationPlan> = {}): InstallationPlan {
  return { tenantId: "tenant-1", projectId: "project-1", startDate: 1000, endDate: 2000, ...overrides };
}

describe("createInstallationPlan", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("creates the plan with the fixed Installation activity and maps the response", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { FieldPlans: [{ id: "plan-1", tenantId: "tenant-1", projectId: "project-1" }] },
    });

    const result = await createInstallationPlan(plan(), "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/field-planner/v1/field-plans/_create",
      expect.objectContaining({
        FieldPlans: [expect.objectContaining({ activities: [{ code: "INS", name: "Installation" }] })],
      }),
    );
    expect(result.plan.id).toBe("plan-1");
    expect(result.reviewerError).toBeUndefined();
  });

  it("throws INSTALLATION_PLAN_CREATE_FAILED when the response has no created id", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { FieldPlans: [{}] } });

    await expect(createInstallationPlan(plan(), "token-1")).rejects.toThrow(
      "INSTALLATION_PLAN_CREATE_FAILED",
    );
  });

  it("assigns the reviewer when reviewerCode is set, and still returns the plan if that assignment fails", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { FieldPlans: [{ id: "plan-1", tenantId: "tenant-1", projectId: "project-1" }] } })
      .mockRejectedValueOnce(new Error("assign failed"));

    const result = await createInstallationPlan(
      plan({ additionalDetails: { reviewerCode: "reviewer-1" } }),
      "token-1",
    );

    expect(result.plan.id).toBe("plan-1");
    expect(result.reviewerError).toBeInstanceOf(Error);
  });

  it("does not attempt a reviewer assignment when reviewerCode is absent", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { FieldPlans: [{ id: "plan-1", tenantId: "tenant-1", projectId: "project-1" }] },
    });

    await createInstallationPlan(plan(), "token-1");

    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });
});

describe("assignInstallationReviewer", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset().mockResolvedValue({ data: {} });
  });

  it("posts the assignment using the plan's own start/end dates and the QC-team role code", async () => {
    await assignInstallationReviewer("plan-1", "reviewer-1", 1000, 2000, "token-1", { uuid: "u1" } as never);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/activity/v1/activities/_assign-activity",
      expect.objectContaining({
        ActivityAssignment: [
          expect.objectContaining({
            fieldPlanId: "plan-1",
            activityId: "INS",
            assignedTo: "reviewer-1",
            assignedBy: "u1",
            role: { code: "INSTALLATION_REPORT_APPROVER_QC_TEAM", name: "Installation Report Approver QC Team" },
            startDate: 1000,
            endDate: 2000,
          }),
        ],
      }),
    );
  });

  it("falls back to Date.now() and Date.now()+1day when plan dates are missing", async () => {
    const now = 5_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    await assignInstallationReviewer("plan-1", "reviewer-1", undefined, undefined, "token-1");

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as {
      ActivityAssignment: Array<{ startDate: number; endDate: number }>;
    };
    expect(body.ActivityAssignment[0].startDate).toBe(now);
    expect(body.ActivityAssignment[0].endDate).toBe(now + 24 * 60 * 60 * 1000);

    vi.restoreAllMocks();
  });
});

describe("searchAssignedReviewer", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns the assignedTo of the first non-deleted assignment", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        ActivityAssignment: [
          { assignedTo: "deleted-reviewer", isDeleted: true },
          { assignedTo: "reviewer-1", isDeleted: false },
        ],
      },
    });

    await expect(searchAssignedReviewer("plan-1", "token-1")).resolves.toBe("reviewer-1");
  });

  it("returns undefined when no active assignment exists", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ActivityAssignment: [] } });

    await expect(searchAssignedReviewer("plan-1", "token-1")).resolves.toBeUndefined();
  });
});

describe("updateInstallationPlan", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("updates the plan and repairs a missing reviewer assignment", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { FieldPlans: [{ id: "plan-1", tenantId: "tenant-1", projectId: "project-1" }] } })
      .mockResolvedValueOnce({ data: { ActivityAssignment: [] } })
      .mockResolvedValueOnce({ data: {} });

    const result = await updateInstallationPlan(
      plan({ id: "plan-1", additionalDetails: { reviewerCode: "reviewer-1" } }),
      "token-1",
    );

    expect(apiClient.post).toHaveBeenCalledTimes(3);
    expect(result.plan.id).toBe("plan-1");
    expect(result.reviewerError).toBeUndefined();
  });

  it("does not re-assign when a reviewer is already assigned", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { FieldPlans: [{ id: "plan-1", tenantId: "tenant-1", projectId: "project-1" }] } })
      .mockResolvedValueOnce({ data: { ActivityAssignment: [{ assignedTo: "reviewer-1", isDeleted: false }] } });

    await updateInstallationPlan(plan({ id: "plan-1", additionalDetails: { reviewerCode: "reviewer-1" } }), "token-1");

    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it("falls back to the input plan when the response has no updated row", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });
    const input = plan({ id: "plan-1" });

    const result = await updateInstallationPlan(input, "token-1");

    expect(result.plan).toBe(input);
  });
});

describe("searchInstallationPlans", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("maps FieldPlans rows and defaults status to DRAFT", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { FieldPlans: [{ id: "plan-1", tenantId: "tenant-1", projectId: "project-1" }], TotalCount: 1 },
    });

    const result = await searchInstallationPlans({}, "token-1", { tenantId: "tenant-1" } as never);

    expect(result.plans).toEqual([
      { plan: expect.objectContaining({ id: "plan-1" }), status: "DRAFT" },
    ]);
    expect(result.totalCount).toBe(1);
  });

  it("filters by projectId when given", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { FieldPlans: [] } });

    await searchInstallationPlans({ criteria: { projectId: "project-1" } }, "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        FieldPlans: expect.objectContaining({ projectIds: ["project-1"] }),
      }),
      expect.anything(),
    );
  });
});

describe("publishInstallationPlan", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("publishes and returns the plan reflecting the confirmed status", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { fieldPlanId: "plan-1", planStatus: "PUBLISHED" } });

    const result = await publishInstallationPlan("plan-1", [], "token-1", { tenantId: "tenant-1" } as never);

    expect(result.additionalDetails?.status).toBe("PUBLISHED");
  });

  it("throws INSTALLATION_PLAN_PUBLISH_UNCONFIRMED when planStatus is missing, rather than assuming success", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    await expect(publishInstallationPlan("plan-1", [], "token-1")).rejects.toThrow(
      "INSTALLATION_PLAN_PUBLISH_UNCONFIRMED",
    );
  });

  it("uses a 20 second timeout", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { fieldPlanId: "plan-1", planStatus: "PUBLISHED" } });

    await publishInstallationPlan("plan-1", [], "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(expect.any(String), expect.anything(), { timeout: 20_000 });
  });
});
