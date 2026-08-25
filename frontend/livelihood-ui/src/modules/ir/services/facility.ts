import type { AuthUser } from "@/shared";
import { FACILITY_ENTRY_FIXTURES } from "./fixtures";
import type { FacilityEntry } from "../types/facility-review";

/**
 * Dummy implementation — returns fixture data scoped to `planId`. Each facility
 * can surface up to two independent entries here (Machine and Solar BOM); they
 * come back as ordinary separate rows, no pairing/grouping needed.
 */
export async function searchFacilityEntries(
  tenantId: string,
  planId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<FacilityEntry[]> {
  void tenantId;
  void accessToken;
  void user;

  return FACILITY_ENTRY_FIXTURES[planId] ?? [];
}

export interface BulkApproveFacilityEntriesInput {
  entryIds: string[];
}

export interface BulkApproveFacilityEntriesResponse {
  approvedEntryIds: string[];
}

/** Dummy implementation — pretends every requested entry approved successfully. */
export async function bulkApproveFacilityEntries(
  input: BulkApproveFacilityEntriesInput,
  accessToken: string,
  user?: AuthUser | null,
): Promise<BulkApproveFacilityEntriesResponse> {
  void accessToken;
  void user;

  return { approvedEntryIds: input.entryIds };
}
