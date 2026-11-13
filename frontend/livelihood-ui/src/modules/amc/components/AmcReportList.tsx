import { translateOr, useDebouncedValue, useTranslate } from "@/shared";
import { Tabs, TabsList, TabsTrigger } from "@/ui";
import { useEffect, useMemo, useState } from "react";
import { useAmcReportFilterSource, useAmcReports } from "../hooks/use-amc-reports";
import type { AmcReportTab } from "../types/amc-report";
import { buildAmcFilterOptions, pruneAmcGeography } from "../utils/filter-options";
import { AmcReportFilter, EMPTY_AMC_REPORT_FILTERS, type AmcReportFilterState } from "./AmcReportFilter";
import { AmcReportTable } from "./AmcReportTable";

const DEFAULT_PAGE_SIZE = 10;

// The Pending Approval tab holds every report that went to manual review, so it opens filtered to
// the ones still waiting (what the PRD's "Report Status" filter can then widen).
function initialFilters(tab: AmcReportTab): AmcReportFilterState {
  return tab === "pending" ? { ...EMPTY_AMC_REPORT_FILTERS, statuses: ["PENDING_APPROVAL"] } : EMPTY_AMC_REPORT_FILTERS;
}

interface AmcReportListProps {
  tab: AmcReportTab;
  onTabChange: (tab: AmcReportTab) => void;
  projectId?: string;
}

/** Report-Specific view body: tabs, filters, search and the paged table. */
export function AmcReportList({ tab, onTabChange, projectId }: Readonly<AmcReportListProps>) {
  const { t } = useTranslate();
  const [filters, setFilters] = useState<AmcReportFilterState>(() => initialFilters(tab));
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setFilters(initialFilters(tab));
    setSearchText("");
    setCurrentPage(0);
  }, [tab]);

  const { data: filterSource = [] } = useAmcReportFilterSource(tab, projectId);
  const options = useMemo(
    () => buildAmcFilterOptions(filterSource, { states: filters.states, districts: filters.districts }),
    [filterSource, filters.states, filters.districts],
  );

  const { data, isLoading } = useAmcReports({
    tab,
    projectId,
    vendors: filters.vendors,
    states: filters.states,
    districts: filters.districts,
    blocks: filters.blocks,
    statuses: tab === "pending" ? filters.statuses : undefined,
    slaBreachedOnly: tab === "pending" ? filters.slaBreachedOnly : undefined,
    submittedFrom: tab === "pending" ? filters.submittedFrom : undefined,
    submittedTo: tab === "pending" ? filters.submittedTo : undefined,
    searchText: debouncedSearch,
    offset: currentPage * pageSize,
    limit: pageSize,
  });

  function handleFilterChange(next: AmcReportFilterState) {
    const nextOptions = buildAmcFilterOptions(filterSource, { states: next.states, districts: next.districts });
    setFilters(pruneAmcGeography(next, nextOptions));
    setCurrentPage(0);
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
        onSearchTextChange={(value) => {
          setSearchText(value);
          setCurrentPage(0);
        }}
      />

      <AmcReportTable
        tab={tab}
        reports={data?.AmcReports ?? []}
        totalCount={data?.totalCount ?? 0}
        isLoading={isLoading}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(0);
        }}
      />
    </div>
  );
}
