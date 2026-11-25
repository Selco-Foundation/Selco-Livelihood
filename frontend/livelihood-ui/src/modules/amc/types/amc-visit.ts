// Raw shapes of the AMC service (`/asset-amc`) as the reviewer screens read them. Only the fields
// the screens use are typed; see development/AMC_module/Livelihood_AMC_API_Contract.

export type AmcVisitStatus = "SCHEDULED" | "PENDING_OTP_APPROVAL" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
export type AmcApprovedBy = "SYSTEM" | "REVIEWER";

/** `searchCriteria` of `/asset-amc/v1/visit/_search`. Boundary filters are codes (prefix match). */
export interface AmcVisitSearchCriteria {
  tenantId: string;
  ids?: string[];
  statuses?: AmcVisitStatus[];
  projectsIds?: string[];
  vendorIds?: string[];
  states?: string[];
  districts?: string[];
  blocks?: string[];
  approvedBy?: AmcApprovedBy;
  slaBreached?: boolean;
  latestSubmissionFrom?: number;
  latestSubmissionTo?: number;
  searchText?: string;
  includeSiteDetails?: boolean;
  isCountQuery?: boolean;
}

export interface RawAmcAutoApprovalRule {
  code: string;
  fieldName?: string;
  label?: string;
  labelKey?: string;
  unit?: string | null;
  reading?: string | number | null;
  passed: boolean;
  reason?: string | null;
  applicable?: boolean;
  acceptedRange?: string;
  acceptedRangeKey?: string;
}

export interface RawAmcSystemStatus {
  isSystemInUse?: boolean | null;
  isSystemFunctional?: boolean | null;
}

export interface RawAmcDocument {
  documentType?: string;
  fileStoreId?: string;
}

export interface RawAmcProcessInstance {
  action?: string;
  comment?: string | null;
  state?: { state?: string } | null;
  assigner?: { name?: string | null } | null;
  auditDetails?: { createdTime?: number } | null;
}

export interface RawAmcSiteDetails {
  solarAssetId?: string | null;
  installationDate?: number | null;
  purchaseOrderNumber?: string | null;
  batteryType?: string | null;
  systemType?: string | null;
  pinCode?: string | null;
}

export interface RawAmcVisit {
  id: string;
  projectId?: string;
  facilityId?: string;
  facilityName?: string | null;
  facility?: { facility_name?: string | null; facility_poc_phone?: string | null } | null;
  state?: string | null;
  district?: string | null;
  block?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  fieldStaff?: { uuid?: string; name?: string | null; mobile?: string | null } | null;
  visitNumber?: number;
  totalVisits?: number | null;
  scheduledDate?: number | null;
  firstSubmissionDate?: number | null;
  latestSubmissionDate?: number | null;
  status: AmcVisitStatus;
  approvedBy?: AmcApprovedBy | null;
  slaDueDate?: number | null;
  slaBreached?: boolean | null;
  slaDaysRemaining?: number | null;
  siteDetails?: RawAmcSiteDetails | null;
  visitReport?: {
    responses?: Record<string, unknown> | null;
    documents?: RawAmcDocument[] | null;
    additionalDetails?: { systemStatus?: RawAmcSystemStatus | null } | null;
  } | null;
  additionalDetails?: {
    reportPdf?: { fileStoreId?: string } | null;
    autoApproval?: { passed?: boolean; rules?: RawAmcAutoApprovalRule[] } | null;
    systemStatus?: RawAmcSystemStatus | null;
  } | null;
  processInstances?: RawAmcProcessInstance[] | null;
}

export interface AmcVisitSearchResponse {
  ScheduledVisits?: RawAmcVisit[];
  TotalCount?: number;
}

export interface RawAmcProjectSummary {
  projectId: string;
  projectName?: string | null;
  projectNumber?: string | null;
  pendingCount?: number;
  breachedCount?: number;
  autoApprovedCount?: number;
  reviewerApprovedCount?: number;
  reworkCount?: number;
  states?: string[];
  districts?: string[];
  blocks?: string[];
}

export interface AmcProjectSummarySearchResponse {
  ProjectSummaries?: RawAmcProjectSummary[];
  TotalCount?: number;
}

/** One rework reason as the workflow `comment` carries it (a JSON string of this list). */
export interface AmcReworkReason {
  reason: string;
  comment?: string;
}
