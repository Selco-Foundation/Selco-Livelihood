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
  searchText?: string;
  pageOffset?: number;
  pageSize?: number;
}

export interface ActivitySearchResult {
  activities: ReviewActivity[];
  totalCount: number;
}

export function useActivities(planId: string, options: UseActivitiesOptions = {}) {
  const { boundaryCodes, statuses, searchText, pageOffset = 0, pageSize = 10 } = options;
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

/** `isAllSelected: true` bulk-approves every activity matching `filters`
 * server-side (qc's "select all" checkbox semantics) instead of an explicit
 * id list — see BulkActivityFacilityWorkflowCriteria's own doc comment. */
export interface BulkApproveInput {
  isAllSelected: boolean;
  activityIds: string[];
  filters?: {
    boundaryCodes?: string[];
    statuses?: string[];
    searchText?: string;
  };
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
          isAllSelected: input.isAllSelected,
          ...(input.isAllSelected
            ? {
                filters: {
                  searchCriteria: {
                    fieldPlanIds: [planId],
                    activityCodes: [ACTIVITY_CODE_INSTALLATION],
                    statuses: input.filters?.statuses?.length
                      ? input.filters.statuses
                      : ["SUBMITTED_BY_FIELD_STAFF"],
                    ...(input.filters?.searchText ? { facilityName: input.filters.searchText } : {}),
                    ...(input.filters?.boundaryCodes?.length
                      ? { boundaryCodes: input.filters.boundaryCodes }
                      : {}),
                  },
                },
              }
            : { activityFacilityIds: input.activityIds }),
        },
        employeeTenantId!,
        accessToken!,
        user,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ir-activities", employeeTenantId, planId],
      });
    },
  });
}
