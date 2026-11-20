import { translateOr, useBoundaryHierarchy, useDebouncedValue, useTranslate } from "@/shared";
import { Tabs, TabsList, TabsTrigger } from "@/ui";
import { useAmcReportFilterOptions, useAmcReports } from "../hooks/use-amc-reports";
import {
  amcReportListKey,
  INITIAL_AMC_REPORT_LIST_STATE,
  useAmcReportListStore,
  type AmcReportListState,
} from "../stores/report-list-store";
import type { AmcReportTab } from "../types/amc-report";
import { buildGeographyOptions, pruneAmcGeography } from "../utils/filter-options";
import { AmcReportFilter, type AmcReportFilterState } from "./AmcReportFilter";
import { AmcReportTable } from "./AmcReportTable";

interface AmcReportListProps {
  tab: AmcReportTab;
  onTabChange: (tab: AmcReportTab) => void;
  projectId?: string;
}

/** Report-Specific view body: tabs, filters, search and the paged table. */
export function AmcReportList({ tab, onTabChange, projectId }: Readonly<AmcReportListProps>) {
  const { t } = useTranslate();
  const listKey = amcReportListKey(projectId, tab);
  const { filters, searchText, currentPage, pageSize } = useAmcReportListStore(
    (state) => state.lists[listKey] ?? INITIAL_AMC_REPORT_LIST_STATE,
  );
  const updateList = useAmcReportListStore((state) => state.update);
  const update = (patch: Partial<AmcReportListState>) => updateList(listKey, patch);
  const debouncedSearch = useDebouncedValue(searchText);

  // Pending tab opens on the reports waiting for review; its "Report Status" filter picks another.
  const options = useAmcReportFilterOptions({ states: filters.states, districts: filters.districts });
  const { data: hierarchy } = useBoundaryHierarchy();
  const pending = tab === "pending";

  const { data, isLoading } = useAmcReports({
    tab,
    projectId,
    vendorIds: filters.vendors,
    states: filters.states,
    districts: filters.districts,
    blocks: filters.blocks,
    status: pending ? filters.status : undefined,
    slaBreachedOnly: pending ? filters.slaBreachedOnly : undefined,
    submittedFrom: pending ? filters.submittedFrom : undefined,
    submittedTo: pending ? filters.submittedTo : undefined,
    searchText: debouncedSearch,
    offset: currentPage * pageSize,
    limit: pageSize,
  });

  function handleFilterChange(next: AmcReportFilterState) {
    const nextOptions = buildGeographyOptions(hierarchy, { states: next.states, districts: next.districts }, (code) => code);
    update({ filters: pruneAmcGeography(next, nextOptions), currentPage: 0 });
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(value) => onTabChange(value as AmcReportTab)}>
        <TabsList>
          <TabsTrigger value="pending">{translateOr(t, "ES_AMC_TAB_PENDING_APPROVAL", "Pending Approval")}</TabsTrigger>
          <TabsTrigger value="auto">{translateOr(t, "ES_AMC_TAB_AUTO_APPROVED", "Auto-Approved")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <AmcReportFilter
        tab={tab}
        options={options}
        filters={filters}
        searchText={searchText}
        onFilterChange={handleFilterChange}
        onSearchTextChange={(value) => update({ searchText: value, currentPage: 0 })}
      />

      <AmcReportTable
        showSla={pending && filters.status === "PENDING_APPROVAL"}
        projectId={projectId}
        reports={data?.reports ?? []}
        totalCount={data?.totalCount ?? 0}
        isLoading={isLoading}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={(page) => update({ currentPage: page })}
        onPageSizeChange={(size) => update({ pageSize: size, currentPage: 0 })}
      />
    </div>
  );
}
