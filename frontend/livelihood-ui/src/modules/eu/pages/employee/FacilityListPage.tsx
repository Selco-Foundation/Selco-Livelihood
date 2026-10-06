import { employeeHomePath, translateOr, useAuthStore, useBoundaryHierarchy, useTranslate } from "@/shared";
import { TopBar } from "@/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FacilityFilterPanel } from "../../components/facility/FacilityFilterPanel";
import { FacilityFormDialog } from "../../components/facility/FacilityFormDialog";
import { FacilityTable } from "../../components/facility/FacilityTable";
import { useFacilities } from "../../hooks/use-facilities";
import { hasEuAccess } from "../../utils/access";
import { euFacilitiesBulkAddPath } from "../../utils/paths";
import { EMPTY_FACILITY_FILTERS, type FacilitySearchFilters } from "../../types/facility";

const DEFAULT_PAGE_SIZE = 10;

export function FacilityListPage() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [filters, setFilters] = useState<FacilitySearchFilters>(EMPTY_FACILITY_FILTERS);
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [showAddFacility, setShowAddFacility] = useState(false);

  const { data: boundaryData } = useBoundaryHierarchy();
  const { data, isLoading } = useFacilities(filters, boundaryData, pageSize, pageOffset);

  if (!hasEuAccess(user?.roles)) {
    return null;
  }

  const totalCount = data?.total ?? 0;
  const currentPage = Math.floor(pageOffset / pageSize);

  function handleFilterChange(nextFilters: FacilitySearchFilters) {
    setFilters(nextFilters);
    setPageOffset(0);
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={translateOr(t, "END_USER_SITES", "End User Sites")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "END_USER_SITES", "End User Sites") },
        ]}
      />

      <FacilityFilterPanel
        boundaryData={boundaryData}
        filters={filters}
        onFilterChange={handleFilterChange}
        onAddFacility={() => setShowAddFacility(true)}
        onBulkAdd={() => void navigate({ to: euFacilitiesBulkAddPath() })}
      />

      <FacilityTable
        facilities={data?.facilities ?? []}
        isLoading={isLoading}
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

      <FacilityFormDialog open={showAddFacility} onOpenChange={setShowAddFacility} />
    </div>
  );
}
