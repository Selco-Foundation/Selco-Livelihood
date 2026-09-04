import type { AuthUser } from "@/shared";
import { buildReviewDetailFixture, FACILITY_ENTRY_FIXTURES } from "./fixtures";
import type {
  FacilityReviewDetail,
  SubmitFacilityReviewInput,
  SubmitFacilityReviewResponse,
} from "../types/facility-review";

function findFacilityEntry(entryId: string) {
  return Object.values(FACILITY_ENTRY_FIXTURES)
    .flat()
    .find((entry) => entry.entryId === entryId);
}

/** Dummy implementation — builds placeholder section content for the fixture entry. */
export async function fetchFacilityReviewDetail(
  entryId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<FacilityReviewDetail | null> {
  void accessToken;
  void user;

  const entry = findFacilityEntry(entryId);
  return entry ? buildReviewDetailFixture(entry) : null;
}

/**
 * Dummy implementation — reuses qc's single whole-report workflow action
 * (APPROVE/REJECT), no dependency on a per-section review endpoint. Signature
 * matches what a real `workflow/update` call needs so swapping this out later
 * doesn't change callers.
 *
 * `input.rejectionReasons` is a per-section list of `{reasonCode, reasonLabel,
 * comment}`. When the real endpoint lands, flatten each entry into one
 * workflow comment tagged with its section id (matching qc's
 * `formatRejectionReasons`) as part of that same request — not a separate
 * per-section call.
 */
export async function submitFacilityReview(
  input: SubmitFacilityReviewInput,
  accessToken: string,
  user?: AuthUser | null,
): Promise<SubmitFacilityReviewResponse> {
  void accessToken;
  void user;

  return {
    entryId: input.entryId,
    status: input.action === "APPROVE" ? "APPROVED_BY_QC_SPOC" : "REJECTED_BY_QC_SPOC",
  };
}
