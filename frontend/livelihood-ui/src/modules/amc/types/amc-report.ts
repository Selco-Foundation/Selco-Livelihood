import type { AmcApprovedBy, AmcVisitStatus } from "./amc-visit";

export type { AmcApprovedBy } from "./amc-visit";
export type AmcReportStatus = AmcVisitStatus;

/** Pending Approval tab = reports that went to manual review; Auto-Approved tab = approved by the system. */
export type AmcReportTab = "pending" | "auto";

export interface AmcRuleResult {
  code: string;
  labelKey: string;
  label: string;
  reading: string;
  acceptedRangeKey: string;
  acceptedRange: string;
  passed: boolean;
}

export interface AmcReportField {
  labelKey: string;
  label: string;
  value: string;
}

export interface AmcReportSection {
  code: string;
  titleKey: string;
  title: string;
  fields: AmcReportField[];
}

export interface AmcReportPhoto {
  documentType: string;
  fileStoreId: string;
  titleKey: string;
  title: string;
}

export interface AmcReportHistoryEntry {
  /** The workflow action, e.g. SUBMIT_VISIT_REPORT, SUBMIT_OTP, APPROVE, REJECT. */
  action: string;
  actor: string;
  date?: number;
  /** Rework reasons (codes) and their comment, for a REJECT step. */
  reasons: { code: string; comment?: string }[];
  /** Free-text comment of any other step. */
  comment?: string;
}

export interface AmcSla {
  daysRemaining: number;
  breached: boolean;
}

/** One AMC visit report as the reviewer screens show it. */
export interface AmcReport {
  id: string;
  projectId?: string;
  endUserName: string;
  endUserPhone: string;
  state: string;
  district: string;
  block: string;
  vendorName: string;
  fieldStaffName: string;
  visitNumber: number;
  totalVisits?: number;
  scheduledDate?: number;
  firstSubmissionDate?: number;
  latestSubmissionDate?: number;
  status: AmcReportStatus;
  approvedBy?: AmcApprovedBy;
  /** Only while the report waits for review. */
  sla?: AmcSla;
  systemInUse?: boolean;
  systemFunctional?: boolean;
  ruleResults: AmcRuleResult[];
  sections: AmcReportSection[];
  photos: AmcReportPhoto[];
  history: AmcReportHistoryEntry[];
  reportPdfFileStoreId?: string;
}

/** What the reports list asks for; `utils/visit-criteria.ts` turns it into the visit search. */
export interface AmcReportSearchCriteria {
  tab: AmcReportTab;
  projectId?: string;
  vendorIds?: string[];
  states?: string[];
  districts?: string[];
  blocks?: string[];
  /** Pending tab only: one of PENDING_APPROVAL (default), REJECTED, APPROVED (by a reviewer). */
  status?: AmcReportStatus;
  slaBreachedOnly?: boolean;
  submittedFrom?: number;
  submittedTo?: number;
  searchText?: string;
  offset?: number;
  limit?: number;
}

export interface AmcReportPage {
  reports: AmcReport[];
  totalCount: number;
}

export interface AmcProjectSummary {
  projectId: string;
  projectName: string;
  states: string[];
  districts: string[];
  blocks: string[];
  pendingCount: number;
  breachedCount: number;
  autoApprovedCount: number;
  reviewerApprovedCount: number;
  reworkCount: number;
}
