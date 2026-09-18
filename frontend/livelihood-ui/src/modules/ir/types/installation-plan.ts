export interface InstallationPlan {
  planId: string;
  planName: string;
  tenantId: string;
  totalFacilities: number;
  startDate: string;
  endDate: string;
  pendingReviewCount: number;
  completionRate: number;
  /** Seeds the shared boundary-service lookup (see hooks/use-boundary) —
   * fetches every district/block in the state, which the District/Block
   * filter options are then narrowed down from using `districtCodes`/
   * `blockCodes` below, rather than showing the whole state. */
  stateCode?: string;
  /** Real district codes actually part of this field plan (the activity
   * assignment's own geography rollup, not the project's full eligible
   * service area — those can differ, e.g. a project spans 3 districts but
   * this particular plan only assigned facilities in 2 of them). */
  districtCodes?: string[];
  /** Real block codes actually part of this field plan, same rollup as
   * `districtCodes` above. */
  blockCodes?: string[];
}

export interface InstallationPlanSearchResponse {
  plans: InstallationPlan[];
  totalCount: number;
}

// Raw `/activity/v1/activities/assignment/_search` response shapes — field
// names (including the API's own "statusAgregation" spelling) match the
// wire format exactly, mapped into `InstallationPlan` in
// services/installation-plan.ts.
export interface ActivityAssignmentStatusAggregation {
  status: string;
  occurrences: number;
}

export interface ActivityAssignmentGeographyDetails {
  state?: string;
  districts?: string[];
  blocks?: string[];
}

export interface ActivityAssignmentFieldPlan {
  id: string;
  name: string;
  geographyDetails?: ActivityAssignmentGeographyDetails;
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
