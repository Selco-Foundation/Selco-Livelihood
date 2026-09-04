import { employeeHomePath, translateOr, useAuthStore, useBoundary, useTranslate } from "@/shared";
import { TopBar } from "@/ui";
import { useMemo, useState } from "react";
import { FacilityEntryTable } from "../../components/facility/FacilityEntryTable";
import {
  EMPTY_FACILITY_FILTERS,
  type FacilityEntryFilterState,
  type FacilityFilterOption,
} from "../../components/facility/FacilityEntryFilter";
import { useBulkApproveFacilityEntries, useFacilityEntries } from "../../hooks/use-facility-entries";
import { useFacilityStatusOptions } from "../../hooks/use-facility-status-options";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import { boundaryDisplayName, cascadeBlockOptions, resolveBoundaryCodes } from "../../utils/boundary";
import { hasIrAccess } from "../../utils/access";
import { irInstallationPlansPath } from "../../utils/paths";

const DEFAULT_PAGE_SIZE = 10;

// The entries route's path is computed at runtime via contextPath(), so there's no
// static `Route` export for typed params — read the plan id from the URL segments
// directly instead, same convention as ComplaintDetailsPage.
function useFacilityEntriesRouteParams() {
  return useMemo(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const index = segments.indexOf("entries");
    return { planId: index >= 0 ? (segments[index + 1] ?? "") : "" };
  }, []);
}

export function FacilityEntryListPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { planId } = useFacilityEntriesRouteParams();

  const [filters, setFilters] = useState<FacilityEntryFilterState>(EMPTY_FACILITY_FILTERS);
  const [searchText, setSearchText] = useState("");
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Scoped to this one field plan via fieldPlanIds — the authoritative source
  // for breadcrumb/summary data and the field plan's state (which seeds the
  // boundary lookup below), independent of the facility search's own
  // filters/pagination.
  const { data: plansData } = useInstallationPlans({ fieldPlanIds: planId ? [planId] : undefined });
  const plan = plansData?.plans.find((item) => item.planId === planId);
  const planName = plan?.planName ?? planId;
  const startDate = plan?.startDate ?? "-";
  const endDate = plan?.endDate ?? "-";

  // Same shared boundary-service lookup as qc's Filter.js
  // (`useBoundary(fieldPlan?.stateBoundaryCode, "State")`) and im's InboxFilter
  // — District/Block options come from here, not from the facility search
  // response, so they stay stable across filters/pagination and cascade
  // properly (matches im's InboxFilter pattern).
  const { data: boundaryData } = useBoundary(plan?.stateCode ? [plan.stateCode] : []);

  const { data, isLoading } = useFacilityEntries(planId, {
    boundaryCodes: resolveBoundaryCodes(filters, boundaryData?.blocks ?? [], boundaryData?.facilities ?? []),
    statuses: filters.status.length > 0 ? filters.status : undefined,
    searchText,
    pageOffset,
    pageSize,
  });

  const bulkApprove = useBulkApproveFacilityEntries(planId);
  const { options: statusOptions } = useFacilityStatusOptions();

  const districtOptions: FacilityFilterOption[] = (boundaryData?.districts ?? []).map((district) => ({
    code: district.code,
    name: boundaryDisplayName(district.code, t),
  }));
  const blockOptions: FacilityFilterOption[] = cascadeBlockOptions(
    boundaryData?.blocks ?? [],
    filters.district,
  ).map((block) => ({ code: block.code, name: boundaryDisplayName(block.code, t) }));

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  const totalCount = data?.totalCount ?? 0;
  const currentPage = Math.floor(pageOffset / pageSize);

  function handleFilterChange(nextFilters: FacilityEntryFilterState) {
    // Selecting a district can invalidate an already-selected block from a
    // different district — prune it, matching im's InboxFilter cascade.
    const validBlockCodes = new Set(
      cascadeBlockOptions(boundaryData?.blocks ?? [], nextFilters.district).map((block) => block.code),
    );
    setFilters({
      ...nextFilters,
      block: nextFilters.block.filter((code) => validBlockCodes.has(code)),
    });
    setPageOffset(0);
  }

  function handleSearchTextChange(nextSearchText: string) {
    setSearchText(nextSearchText);
    setPageOffset(0);
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={translateOr(t, "ES_IR_REVIEW_SITES", "Review Sites")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          {
            label: translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans"),
            to: irInstallationPlansPath(),
          },
          { label: planName },
        ]}
      />
      <div className="livelihood-card grid gap-6 px-6 py-5 sm:grid-cols-3 sm:px-7">
        <div>
          <p className="text-sm leading-[21px] text-ink-600">
            {translateOr(t, "ES_IR_START_DATE", "Start Date")}
          </p>
          <p className="text-base leading-6 font-semibold text-ink-950">{startDate}</p>
        </div>
        <div>
          <p className="text-sm leading-[21px] text-ink-600">
            {translateOr(t, "ES_IR_COMPLETION_DATE", "Completion Date")}
          </p>
          <p className="text-base leading-6 font-semibold text-ink-950">{endDate}</p>
        </div>
        <div>
          <p className="text-sm leading-[21px] text-ink-600">
            {translateOr(t, "ES_IR_TOTAL_END_USERS_ASSIGNED", "Total End Users Assigned")}
          </p>
          <p className="text-base leading-6 font-semibold text-ink-950">
            {plan?.totalFacilities ?? "-"}
          </p>
        </div>
      </div>
      <FacilityEntryTable
        planId={planId}
        entries={data?.entries ?? []}
        isLoading={isLoading}
        districtOptions={districtOptions}
        blockOptions={blockOptions}
        statusOptions={statusOptions}
        filters={filters}
        searchText={searchText}
        onFilterChange={handleFilterChange}
        onSearchTextChange={handleSearchTextChange}
        onBulkApprove={(entryIds) => bulkApprove.mutate(entryIds)}
        isBulkApproving={bulkApprove.isPending}
        currentPage={currentPage}
        totalRecords={totalCount}
        pageSizeLimit={pageSize}
        onNextPage={() => setPageOffset(pageOffset + pageSize)}
        onPrevPage={() => setPageOffset(Math.max(0, pageOffset - pageSize))}
        onPageChange={(page) => setPageOffset(page * pageSize)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageOffset(0);
        }}
      />
    </div>
  );
}
