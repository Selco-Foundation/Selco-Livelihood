import { useAuthStore } from "@/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ACTIVITY_CODE_INSTALLATION,
  bulkUpdateActivityFacilitiesWorkflow,
  searchActivityFacilities,
  toFacilityEntry,
} from "../services/facility";
import type { FacilityEntry } from "../types/facility-review";
import { hasIrAccess } from "../utils/access";

export interface UseFacilityEntriesOptions {
  boundaryCodes?: string[];
  statuses?: string[];
  searchText?: string;
  pageOffset?: number;
  pageSize?: number;
}

export interface FacilityEntrySearchResult {
  entries: FacilityEntry[];
  totalCount: number;
}

export function useFacilityEntries(
  planId: string,
  options: UseFacilityEntriesOptions = {},
) {
  const { boundaryCodes, statuses, searchText, pageOffset = 0, pageSize = 10 } = options;
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);

  const enabled = Boolean(
    accessToken && employeeTenantId && planId && hasIrAccess(user?.roles),
  );

  return useQuery({
    queryKey: [
      "ir-facility-entries",
      employeeTenantId,
      planId,
      boundaryCodes,
      statuses,
      searchText,
      pageOffset,
      pageSize,
    ],
    enabled,
    queryFn: async (): Promise<FacilityEntrySearchResult> => {
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
        entries: rows.map(toFacilityEntry),
        totalCount: data.totalCount ?? 0,
      };
    },
  });
}

export function useBulkApproveFacilityEntries(planId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryIds: string[]) =>
      bulkUpdateActivityFacilitiesWorkflow(
        {
          workflow: { action: "APPROVE", comments: "Approved by Installation Reviewer" },
          isAllSelected: false,
          activityFacilityIds: entryIds,
        },
        employeeTenantId!,
        accessToken!,
        user,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ir-facility-entries", employeeTenantId, planId],
      });
    },
  });
}
