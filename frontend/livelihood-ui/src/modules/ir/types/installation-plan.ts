export interface InstallationPlan {
  planId: string;
  planName: string;
  tenantId: string;
  totalFacilities: number;
  pendingReviewCount: number;
  completionRate: number;
}

export interface InstallationPlanSearchResponse {
  plans: InstallationPlan[];
  totalCount: number;
  pendingReviewCount: number;
}
