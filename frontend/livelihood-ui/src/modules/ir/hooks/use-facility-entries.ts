import { useAuthStore } from "@/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkApproveFacilityEntries,
  searchFacilityEntries,
} from "../services/facility";
import { hasIrAccess } from "../utils/access";

export function useFacilityEntries(planId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);

  const enabled = Boolean(
    accessToken && employeeTenantId && planId && hasIrAccess(user?.roles),
  );

  return useQuery({
    queryKey: ["ir-facility-entries", employeeTenantId, planId],
    enabled,
    queryFn: () => searchFacilityEntries(employeeTenantId!, planId, accessToken!, user),
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
