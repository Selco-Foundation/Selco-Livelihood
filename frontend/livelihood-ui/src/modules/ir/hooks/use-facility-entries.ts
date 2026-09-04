import { useAuthStore } from "@/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkApproveFacilityEntries,
  searchFacilityEntries,
} from "../services/facility";
import { hasIrAccess } from "../utils/access";

export interface UseFacilityEntriesOptions {
  boundaryCodes?: string[];
  statuses?: string[];
  searchText?: string;
  pageOffset?: number;
  pageSize?: number;
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
    queryFn: () =>
      searchFacilityEntries(
        employeeTenantId!,
        planId,
        {
          boundaryCodes,
          statuses,
          facilityName: searchText,
          offset: pageOffset,
          limit: pageSize,
        },
        accessToken!,
        user,
      ),
  });
}

export function useBulkApproveFacilityEntries(planId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryIds: string[]) =>
      bulkApproveFacilityEntries({ entryIds }, accessToken!, user),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ir-facility-entries", employeeTenantId, planId],
      });
    },
  });
}
