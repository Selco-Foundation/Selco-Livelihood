export interface InstallationPlan {
  planId: string;
  planName: string;
  tenantId: string;
  totalFacilities: number;
  startDate: string;
  endDate: string;
  pendingReviewCount: number;
  completionRate: number;
  /** Seeds the shared boundary-service lookup for District/Block filter
   * options (see hooks/use-boundary) — matches qc's `stateBoundaryCode`. */
  stateCode?: string;
}

export interface InstallationPlanSearchResponse {
  plans: InstallationPlan[];
  totalCount: number;
}

// Raw `/activity/v1/activities/assignment/_search` response shapes — field
// names (including the API's own "statusAgregation" spelling) match the wire
// format exactly, mapped into `InstallationPlan` in services/installation-plan.ts.
export interface ActivityAssignmentStatusAggregation {
  status: string;
  occurrences: number;
}

export interface ActivityAssignmentFieldPlan {
  id: string;
  name: string;
  geographyDetails?: { state?: string };
}

export interface ActivityAssignment {
  id: string;
  tenantId: string;
  fieldPlanId: string;
  fieldPlan: ActivityAssignmentFieldPlan;
  startDate: number;
  endDate: number;
  additionalDetails?: {
    countFieldPlanFacilities?: number;
    statusAgregation?: ActivityAssignmentStatusAggregation[];
  };
}

export interface ActivityAssignmentSearchResponse {
  ActivityAssignment: ActivityAssignment[];
  TotalCount: number;
}
