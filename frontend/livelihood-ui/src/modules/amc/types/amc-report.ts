export type AmcReportStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
export type AmcApprovedBy = "SYSTEM" | "REVIEWER";

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

export type AmcReportHistoryAction =
  | "SUBMITTED"
  | "RESUBMITTED"
  | "AUTO_APPROVED"
  | "SENT_TO_REVIEW"
  | "APPROVED"
  | "SENT_FOR_REWORK";

export interface AmcReportHistoryEntry {
  action: AmcReportHistoryAction;
  actor: string;
  date: number;
  comment?: string;
}

export interface AmcReport {
  id: string;
  projectId: string;
  projectName: string;
  planCode: string;
  endUserName: string;
  endUserPhone: string;
  state: string;
  district: string;
  block: string;
  vendorName: string;
  amcNumber: number;
  totalAmcs: number;
  scheduledDate: number;
  firstSubmissionDate: number;
  latestSubmissionDate: number;
  status: AmcReportStatus;
  approvedBy?: AmcApprovedBy;
  systemInUse: boolean;
  systemFunctional: boolean;
  ruleResults: AmcRuleResult[];
  sections: AmcReportSection[];
  photoUrl: string;
  history: AmcReportHistoryEntry[];
}

export interface AmcReportSearchCriteria {
  tab: AmcReportTab;
  projectId?: string;
  vendors?: string[];
  states?: string[];
  districts?: string[];
  blocks?: string[];
  statuses?: AmcReportStatus[];
  slaBreachedOnly?: boolean;
  submittedFrom?: number;
  submittedTo?: number;
  searchText?: string;
  offset?: number;
  limit?: number;
}

export interface AmcReportSearchResponse {
  AmcReports: AmcReport[];
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
}

export interface AmcProjectSearchResponse {
  AmcProjects: AmcProjectSummary[];
}
