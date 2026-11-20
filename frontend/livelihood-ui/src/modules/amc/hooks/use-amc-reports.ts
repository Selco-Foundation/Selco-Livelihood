import { tenantId, translateOr, useAuthStore, useBoundaryHierarchy, useTranslate } from "@/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { searchAmcVisits, searchVendorOrganisations } from "../services/amc-visits";
import type { AmcReportPage, AmcReportSearchCriteria } from "../types/amc-report";
import { hasAmcReviewerAccess } from "../utils/access";
import { buildGeographyOptions, toVendorOptions, type AmcFilterOptions } from "../utils/filter-options";
import { toVisitSearchCriteria } from "../utils/visit-criteria";
import { toAmcReport } from "../utils/visit-mapping";
import { amcKeys } from "./query-keys";

/** One page of AMC reports for the Pending Approval or Auto-Approved tab, filtered on the server. */
export function useAmcReports(criteria: AmcReportSearchCriteria) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.reportList(criteria),
    enabled: Boolean(accessToken) && hasAmcReviewerAccess(user?.roles),
    placeholderData: keepPreviousData,
    queryFn: () =>
      searchAmcVisits(
        toVisitSearchCriteria(criteria, tenantId()),
        { limit: criteria.limit ?? 10, offset: criteria.offset ?? 0 },
        accessToken!,
        user,
      ),
    select: (response): AmcReportPage => ({
      reports: (response.ScheduledVisits ?? []).map(toAmcReport),
      totalCount: response.TotalCount ?? 0,
    }),
  });
}

/**
 * The Vendor, State, District and Block filter options. Geography comes from the boundary tree
 * (districts follow the chosen states, blocks the chosen districts); vendors from the vendor
 * organisations. A list the user may not read (e.g. vendor organisations) is simply empty.
 */
export function useAmcReportFilterOptions(selection: { states: string[]; districts: string[] }): AmcFilterOptions {
  const { t } = useTranslate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const { data: hierarchy } = useBoundaryHierarchy();
  const { data: vendors = [] } = useQuery({
    queryKey: amcKeys.vendorOptions(),
    enabled: Boolean(accessToken) && hasAmcReviewerAccess(user?.roles),
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: () => searchVendorOrganisations(accessToken!, user),
    select: toVendorOptions,
  });

  const { states, districts } = selection;
  return useMemo(
    () => ({
      vendors,
      ...buildGeographyOptions(hierarchy, { states, districts }, (code) => translateOr(t, `BOUNDARY_${code}`, code)),
    }),
    [vendors, hierarchy, states, districts, t],
  );
}
