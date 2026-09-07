import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { SubmitFacilityReviewInput } from "../types/facility-review";

const WORKFLOW_ACTION = {
  APPROVE: "APPROVE",
  REJECT: "REJECT_AND_ASSIGN_FOR_FIELD_QC",
} as const;

/** Flattens per-section rejection reasons into the flat comment list the
 * workflow update expects — matches qc's `formatRejectionReasons`. */
function flattenRejectionReasons(input: SubmitFacilityReviewInput): Array<{
  commentMessage: string;
  assetType: string;
}> {
  const comments: Array<{ commentMessage: string; assetType: string }> = [];
  for (const [sectionId, reasons] of Object.entries(input.rejectionReasons ?? {})) {
    for (const reason of reasons ?? []) {
      comments.push({
        commentMessage: JSON.stringify({
          reasonCode: reason.reasonCode,
          comment: reason.comment,
          sectionLabel: sectionId,
        }),
        assetType: sectionId.toUpperCase(),
      });
    }
  }
  return comments;
}

/**
 * Picks the workflow action/comments from the input, POSTs the update, and
 * returns exactly what the backend sent back — no synthesized response.
 */
export async function submitFacilityReview(
  input: SubmitFacilityReviewInput,
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<unknown> {
  const action = input.action === "APPROVE" ? WORKFLOW_ACTION.APPROVE : WORKFLOW_ACTION.REJECT;
  const comments = input.action === "REJECT" ? flattenRejectionReasons(input) : [];

  const { data } = await apiClient.post(
    "/activity/v1/activities/workflow/update",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      activityFacilityId: input.entryId,
      workflow: {
        action,
        comments:
          input.action === "APPROVE"
            ? "Approved by Installation Reviewer"
            : "Rejected by Installation Reviewer",
      },
      ...(comments.length > 0 ? { transactions: [{ comments }] } : {}),
    },
    { params: { tenantId } },
  );

  return data;
}
