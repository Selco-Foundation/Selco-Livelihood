import type { AmcReportSearchCriteria } from "../types/amc-report";
import type { AmcVisitSearchCriteria } from "../types/amc-visit";

const nonEmpty = (values: string[] | undefined) => (values?.length ? values : undefined);

/**
 * The visit search behind a reports list. Auto-Approved tab: approved by the system. Pending tab:
 * one report status at a time (default: waiting for review). `approvedBy` drops every visit that is
 * not approved, so "Approved" on the Pending tab means approved by a reviewer and cannot be mixed
 * with the other statuses in one search.
 */
export function toVisitSearchCriteria(criteria: AmcReportSearchCriteria, tenantId: string): AmcVisitSearchCriteria {
  const pending = criteria.tab === "pending";
  const status = criteria.status ?? "PENDING_APPROVAL";
  return {
    tenantId,
    statuses: pending ? [status] : ["APPROVED"],
    ...(pending ? (status === "APPROVED" ? { approvedBy: "REVIEWER" as const } : {}) : { approvedBy: "SYSTEM" as const }),
    ...(criteria.projectId ? { projectsIds: [criteria.projectId] } : {}),
    vendorIds: nonEmpty(criteria.vendorIds),
    states: nonEmpty(criteria.states),
    districts: nonEmpty(criteria.districts),
    blocks: nonEmpty(criteria.blocks),
    ...(pending && status === "PENDING_APPROVAL" && criteria.slaBreachedOnly ? { slaBreached: true } : {}),
    ...(pending && criteria.submittedFrom ? { latestSubmissionFrom: criteria.submittedFrom } : {}),
    ...(pending && criteria.submittedTo ? { latestSubmissionTo: criteria.submittedTo } : {}),
    ...(criteria.searchText?.trim() ? { searchText: criteria.searchText.trim() } : {}),
  };
}
