import { useAuthStore } from "@/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ACTIVITY_CODE_INSTALLATION,
  bulkUpdateActivityFacilitiesWorkflow,
  searchActivityFacilities,
} from "../services/facility";
import type { ReviewActivity } from "../types/activity-review";
import { hasIrAccess } from "../utils/access";
import { toReviewActivity } from "../utils/review-activity-mapping";

export interface UseActivitiesOptions {
  boundaryCodes?: string[];
  statuses?: string[];
  componentTypes?: string[];
  searchText?: string;
  pageOffset?: number;
  pageSize?: number;
}

export interface ActivitySearchResult {
  activities: ReviewActivity[];
  totalCount: number;
}

export function useActivities(planId: string, options: UseActivitiesOptions = {}) {
  const { boundaryCodes, statuses, componentTypes, searchText, pageOffset = 0, pageSize = 10 } = options;
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);

  const enabled = Boolean(
    accessToken && employeeTenantId && planId && hasIrAccess(user?.roles),
  );

  return useQuery({
    queryKey: [
      "ir-activities",
      employeeTenantId,
      planId,
      boundaryCodes,
      statuses,
      componentTypes,
      searchText,
      pageOffset,
      pageSize,
    ],
    enabled,
    queryFn: async (): Promise<ActivitySearchResult> => {
      const data = await searchActivityFacilities(
        {
          tenantId: employeeTenantId!,
          fieldPlanIds: [planId],
          activityCodes: [ACTIVITY_CODE_INSTALLATION],
          ...(boundaryCodes?.length ? { boundaryCodes } : {}),
          ...(statuses?.length ? { statuses } : {}),
          ...(componentTypes?.length ? { componentTypes } : {}),
          ...(searchText ? { facilityName: searchText } : {}),
        },
        { limit: pageSize, offset: pageOffset },
        accessToken!,
        user,
      );

      const rows = data.facility ?? [];
      return {
        activities: rows.map(toReviewActivity),
        totalCount: data.totalCount ?? 0,
      };
    },
  });
}

export interface BulkApproveInput {
  activityIds: string[];
}

export function useBulkApproveActivities(planId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BulkApproveInput) =>
      bulkUpdateActivityFacilitiesWorkflow(
        {
          workflow: { action: "APPROVE", comments: "Approved by Installation Reviewer" },
          isAllSelected: false,
          activityFacilityIds: input.activityIds,
        },
        employeeTenantId!,
        accessToken!,
        user,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ir-activities", employeeTenantId, planId],
      });
      // Refreshes plan.pendingReviewCount, which noApprovableActivities and
      // (indirectly, via the plan search) other plan-level counts rely on —
      // otherwise it stays stale after an approval until a full reload.
      void queryClient.invalidateQueries({
        queryKey: ["ir-installation-plans"],
      });
    },
  });
}
