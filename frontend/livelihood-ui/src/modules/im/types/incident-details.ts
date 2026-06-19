import type { VerificationDocument } from "./create-incident";

export interface IncidentAuditDetails {
  createdTime?: number;
  lastModifiedTime?: number;
}

export interface IncidentAdditionalDetail {
  reopenreason?: unknown[];
  rejectReason?: unknown[];
  sendBackReason?: unknown[];
  oowResponses?: OowResponse[];
  outOfScopeReason?: unknown[];
  spcResponses?: SpcResponse[];
  fileStoreId?: VerificationDocument[];
}

export interface OowResponse {
  oowIssue?: string;
  oowRootCause?: string;
  oowRecommendedSolution?: string;
  oowTotalCostOfSolution?: string;
  oowTimeToResolve?: string;
}

export interface SpcResponse {
  spcRootAnalysis?: string;
  spcSparePartToBeReplaced?: string;
}

export interface Incident {
  tenantId: string;
  incidentId: string;
  applicationStatus: string;
  incidentType: string;
  incidentSubType: string;
  systemFunctional?: string;
  district?: string;
  block?: string;
  boundaryCode?: string;
  comments?: string;
  phcSubType?: string;
  filedDate?: number;
  auditDetails?: IncidentAuditDetails;
  additionalDetail?: IncidentAdditionalDetail;
  reporter?: { uuid?: string; tenantId?: string };
}

export interface IncidentWorkflow {
  action?: string;
  comments?: string;
  rating?: number;
  assignes?: string[] | null;
  verificationDocuments?: VerificationDocument[];
  reopenreason?: unknown;
  rejectReason?: unknown;
  sendBackReason?: unknown;
  oowResponses?: OowResponse;
  outOfScopeReason?: unknown;
  spcResponses?: SpcResponse;
}

export interface IncidentWrapper {
  incident: Incident;
  workflow: IncidentWorkflow;
}

export interface IncidentSearchResponse {
  IncidentWrappers?: IncidentWrapper[];
  Errors?: Array<{ message?: string }>;
}

export interface ComplaintDetailsRow {
  labelKey: string;
  value: string;
}

export interface ComplaintDetailsData {
  incidentId: string;
  tenantId: string;
  rows: ComplaintDetailsRow[];
  incident: Incident;
  workflow: IncidentWorkflow;
  images: string[];
  videos: Array<{ master?: string | null; original?: string | null }>;
  thumbnails: string[];
}

export interface WorkflowAssignee {
  name?: string;
  mobileNumber?: string;
  userName?: string;
  uuid?: string;
}

export interface WorkflowProcessInstance {
  action?: string;
  comment?: string;
  rating?: number;
  tenantId?: string;
  businessService?: string;
  assigner?: WorkflowAssignee;
  assignes?: WorkflowAssignee[];
  documents?: VerificationDocument[];
  thumbnailsToShow?: {
    thumbs?: string[];
    images?: string[];
    videos?: Array<{ master?: string | null; original?: string | null }>;
  };
  wfComments?: Array<{ comment?: string }>;
  auditDetails?: {
    createdTime?: number;
    lastModifiedTime?: number;
  };
  state?: {
    state?: string;
    applicationStatus?: string;
    uuid?: string;
    isTerminateState?: boolean;
  };
  nextActions?: Array<{ action?: string; roles?: string }>;
}

export interface WorkflowActionState {
  nextActions?: Array<{
    action?: string;
    roles?: string[];
    assigneeRoles?: string[];
  }>;
}

export interface WorkflowTimelineCheckpoint {
  performedAction?: string;
  status?: string;
  state?: string;
  assigner?: WorkflowAssignee;
  rating?: number;
  wfComment?: string[];
  thumbnailsToShow?: {
    thumbs?: string[];
    fullImage?: string[];
    videos?: Array<{ master?: string | null; original?: string | null }>;
  };
  assignes?: WorkflowAssignee[];
  auditDetails?: {
    created?: string;
    lastModified?: string;
    lastModifiedEpoch?: number;
  };
}

export interface WorkflowDetailsData {
  timeline: WorkflowTimelineCheckpoint[];
  nextActions: Array<{ action: string; roles?: string }>;
  actionState?: WorkflowActionState;
  processInstances: WorkflowProcessInstance[];
  applicationBusinessService?: string;
}

export interface WorkflowProcessSearchResponse {
  ProcessInstances?: WorkflowProcessInstance[];
}

export interface WorkflowBusinessServiceState {
  uuid?: string;
  state?: string;
  applicationStatus?: string;
  isStateUpdatable?: boolean;
  actions?: Array<{
    action?: string;
    roles?: string[];
    nextState?: string;
  }>;
}

export interface WorkflowBusinessServiceResponse {
  BusinessServices?: Array<{
    states?: WorkflowBusinessServiceState[];
  }>;
}

export interface FileStoreUrlEntry {
  id?: string;
  url?: string;
}

export interface FileStoreUrlResponse {
  fileStoreIds?: FileStoreUrlEntry[];
}

export interface EmployeeSearchResult {
  uuid: string;
  name: string;
}

export interface MdmsReasonOption {
  code?: string;
  localizedCode?: string;
  active?: boolean;
}

export interface UpdateIncidentResponse {
  IncidentWrappers?: IncidentWrapper[];
  Errors?: Array<{ message?: string }>;
  message?: string;
}
