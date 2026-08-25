import type { AuthUser } from "@/shared";
import { INSTALLATION_PLAN_FIXTURES } from "./fixtures";
import type { InstallationPlanSearchResponse } from "../types/installation-plan";

export interface InstallationPlanSearchParams {
  limit?: number;
  offset?: number;
  searchText?: string;
}

/**
 * Dummy implementation — returns fixture data. The signature already matches
 * the target restructured `field-planner-activity` ("installation plan")
 * search contract so swapping this body for a real `apiClient` call later
 * doesn't require touching call sites.
 */
export async function searchInstallationPlans(
  tenantId: string,
  params: InstallationPlanSearchParams,
  accessToken: string,
  user?: AuthUser | null,
): Promise<InstallationPlanSearchResponse> {
  void tenantId;
  void accessToken;
  void user;

  const searchText = params.searchText?.toLowerCase().trim();
  const plans = searchText
    ? INSTALLATION_PLAN_FIXTURES.filter((plan) =>
        plan.planName.toLowerCase().includes(searchText),
      )
    : INSTALLATION_PLAN_FIXTURES;

  return {
    plans,
    totalCount: plans.length,
    pendingReviewCount: plans.reduce((sum, plan) => sum + plan.pendingReviewCount, 0),
  };
}
