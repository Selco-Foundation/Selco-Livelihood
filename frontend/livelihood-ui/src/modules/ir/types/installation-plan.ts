export interface InstallationPlan {
  planId: string;
  planName: string;
  tenantId: string;
  activityType: string;
  totalFacilities: number;
  startDate: string;
  endDate: string;
  pendingReviewCount: number;
  completionRate: number;
}

export interface InstallationPlanSearchResponse {
  plans: InstallationPlan[];
  totalCount: number;
  pendingReviewCount: number;
}
