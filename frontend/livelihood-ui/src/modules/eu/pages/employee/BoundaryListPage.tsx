import { employeeHomePath, translateOr, useAuthStore, useBoundaryHierarchy, useTranslate } from "@/shared";
import { TopBar } from "@/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BoundaryFilterPanel } from "../../components/boundary/BoundaryFilterPanel";
import { BoundaryFormDialog } from "../../components/boundary/BoundaryFormDialog";
import { BoundaryTable } from "../../components/boundary/BoundaryTable";
import { useBoundaries } from "../../hooks/use-boundaries";
import { EMPTY_BOUNDARY_FILTERS, type BoundarySearchFilters } from "../../types/boundary";
import { hasEuAccess } from "../../utils/access";
import { euBoundaryUploadPath } from "../../utils/paths";

const DEFAULT_PAGE_SIZE = 10;

export function BoundaryListPage() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [filters, setFilters] = useState<BoundarySearchFilters>(EMPTY_BOUNDARY_FILTERS);
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [showAddBoundary, setShowAddBoundary] = useState(false);

  const { data: boundaryData } = useBoundaryHierarchy();
  const { data, isLoading } = useBoundaries(filters, pageSize, pageOffset);

  if (!hasEuAccess(user?.roles)) {
    return null;
  }

  const totalCount = data?.total ?? 0;
  const currentPage = Math.floor(pageOffset / pageSize);

  function handleFilterChange(nextFilters: BoundarySearchFilters) {
    setFilters(nextFilters);
    setPageOffset(0);
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={translateOr(t, "FA_LABEL_BOUNDARIES", "Boundaries")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "FA_LABEL_BOUNDARIES", "Boundaries") },
        ]}
      />

      <BoundaryFilterPanel
        boundaryData={boundaryData}
        filters={filters}
        onFilterChange={handleFilterChange}
        onAddBoundary={() => setShowAddBoundary(true)}
        onBulkAdd={() => void navigate({ to: euBoundaryUploadPath() })}
      />

      <BoundaryTable
        boundaries={data?.boundaries ?? []}
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

      <BoundaryFormDialog open={showAddBoundary} onOpenChange={setShowAddBoundary} />
    </div>
  );
}
