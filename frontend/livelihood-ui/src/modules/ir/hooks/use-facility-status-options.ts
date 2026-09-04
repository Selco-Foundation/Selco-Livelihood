import { fetchWorkflowBusinessService, tenantId as getTenantId, translateOr, useAuthStore, useTranslate } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import {
  FACILITY_ENTRY_STATUS_LABELS,
  FACILITY_ENTRY_STATUS_ORDER,
  FACILITY_INSTALLATION_BUSINESS_SERVICE,
} from "../constants/facility-status";
import type { FacilityFilterOption } from "../components/facility/FacilityEntryFilter";
import type { FacilityEntryStatus } from "../types/facility-review";

export function useFacilityStatusOptions() {
  const { t } = useTranslate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const tenantId = employeeTenantId || getTenantId();

  const { data, isLoading } = useQuery({
    queryKey: ["ir-facility-installation-states", tenantId],
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
    queryFn: () =>
      fetchWorkflowBusinessService(
        tenantId,
        FACILITY_INSTALLATION_BUSINESS_SERVICE,
        accessToken!,
        user,
      ),
  });

  const availableCodes = new Set(
    (data?.BusinessServices?.[0]?.states ?? [])
      .map((state) => state.applicationStatus)
      .filter((status): status is FacilityEntryStatus => Boolean(status)),
  );

  const options: FacilityFilterOption[] = FACILITY_ENTRY_STATUS_ORDER.filter((status) =>
    availableCodes.has(status),
  ).map((status) => {
    const label = FACILITY_ENTRY_STATUS_LABELS[status];
    return { code: status, name: translateOr(t, label.key, label.fallback) };
  });

  return { options, isLoading };
}
