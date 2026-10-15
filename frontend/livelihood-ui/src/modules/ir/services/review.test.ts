import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/shared";
import { submitFacilityReview } from "./review";
import type { SubmitActivityReviewInput } from "../types/activity-review";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
  };
});

describe("submitFacilityReview", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts an APPROVE action with the fixed approval comment and no transactions", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const input: SubmitActivityReviewInput = {
      activityId: "facility-1",
      action: "APPROVE",
      documents: [{ documentType: "REPORT", fileStoreId: "fs-1" }],
    };

    await submitFacilityReview(input, "tenant-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/activity/v1/activities/workflow/update",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        activityFacilityId: "facility-1",
        workflow: {
          action: "APPROVE",
          comments: "Approved by Installation Reviewer",
          documents: input.documents,
        },
      }),
      { params: { tenantId: "tenant-1" } },
    );
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("transactions");
  });

  it("posts a REJECT action with the reject-and-assign action code and flattened rejection reasons", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const input: SubmitActivityReviewInput = {
      activityId: "facility-1",
      action: "REJECT",
      rejectionReasons: {
        panel: [
          { id: "r1", reasonCode: "DAMAGED", reasonLabel: "Damaged", comment: "cracked glass" },
          { id: "r2", reasonCode: "MISSING", reasonLabel: "Missing", comment: "" },
        ],
        BATTERY: [{ id: "r3", reasonCode: "WRONG_MODEL", reasonLabel: "Wrong model", comment: "mismatch" }],
      },
      documents: [],
    };

    await submitFacilityReview(input, "tenant-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/activity/v1/activities/workflow/update",
      expect.objectContaining({
        activityFacilityId: "facility-1",
        workflow: expect.objectContaining({
          action: "REJECT_AND_ASSIGN_FOR_FIELD_QC",
          comments: "Rejected by Installation Reviewer",
        }),
        transactions: [
          {
            comments: [
              {
                commentMessage: JSON.stringify({
                  reasonCode: "DAMAGED",
                  comment: "cracked glass",
                  sectionLabel: "panel",
                }),
                assetType: "PANEL",
              },
              {
                commentMessage: JSON.stringify({
                  reasonCode: "MISSING",
                  comment: "",
                  sectionLabel: "panel",
                }),
                assetType: "PANEL",
              },
              {
                commentMessage: JSON.stringify({
                  reasonCode: "WRONG_MODEL",
                  comment: "mismatch",
                  sectionLabel: "BATTERY",
                }),
                assetType: "BATTERY",
              },
            ],
          },
        ],
      }),
      { params: { tenantId: "tenant-1" } },
    );
  });

  it("omits transactions for a REJECT action with no rejection reasons", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const input: SubmitActivityReviewInput = {
      activityId: "facility-1",
      action: "REJECT",
      documents: [],
    };

    await submitFacilityReview(input, "tenant-1", "token-1");

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("transactions");
  });

  it("returns the raw response data unmodified", async () => {
    const data = { id: "workflow-1" };
    vi.mocked(apiClient.post).mockResolvedValue({ data });
    const input: SubmitActivityReviewInput = {
      activityId: "facility-1",
      action: "APPROVE",
      documents: [],
    };

    const result = await submitFacilityReview(input, "tenant-1", "token-1");

    expect(result).toEqual(data);
    expect(result).toBe(data);
  });
});
