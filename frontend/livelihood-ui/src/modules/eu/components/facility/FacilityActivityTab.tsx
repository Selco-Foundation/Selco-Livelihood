import { extractApiErrorMessage, translateOr, useTranslate } from "@/shared";
import { Pagination, Skeleton } from "@/ui";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { CategoryFilterPopover, type FilterCategoryDef } from "../CategoryFilterPopover";
import { useActivityTypeOptions } from "../../hooks/use-activity-type-options";
import { useFacilityActivities } from "../../hooks/use-facility-activities";
import { EMPTY_ACTIVITY_FILTERS, type ActivityFilters } from "../../types/activity";
import { euActivityDetailPath } from "../../utils/paths";

const DEFAULT_PAGE_SIZE = 10;

interface FacilityActivityTabProps {
  facilityId: string;
  facilityBoundaryCode: string | undefined;
}

export function FacilityActivityTab({ facilityId, facilityBoundaryCode }: FacilityActivityTabProps) {
  const { t } = useTranslate();
  const [filters, setFilters] = useState<ActivityFilters>(EMPTY_ACTIVITY_FILTERS);
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { activityTypes } = useActivityTypeOptions();
  const { data, isLoading, isError, error } = useFacilityActivities(
    facilityBoundaryCode,
    filters,
    pageSize,
    pageOffset,
  );

  const categories: FilterCategoryDef[] = [
    { key: "activityCode", label: translateOr(t, "CS_ACTIVITY_TYPE", "Activity Type"), options: activityTypes },
  ];

  function toggleOption(categoryKey: string, code: string) {
    const current = filters.activityCode;
    setFilters({
      ...filters,
      [categoryKey]: current.includes(code) ? current.filter((value) => value !== code) : [...current, code],
    });
    setPageOffset(0);
  }

  const activities = data?.activities ?? [];
  const totalCount = data?.total ?? 0;
  const currentPage = Math.floor(pageOffset / pageSize);

  return (
    <div className="space-y-5">
      <CategoryFilterPopover
        categories={categories}
        selected={filters}
        onToggle={toggleOption}
        onClearAll={() => {
          setFilters(EMPTY_ACTIVITY_FILTERS);
          setPageOffset(0);
        }}
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-destructive">
          {extractApiErrorMessage(error) ??
            translateOr(t, "CS_ACTIVITIES_FETCH_FAILED", "Failed to load activities")}
        </div>
      ) : activities.length === 0 ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {translateOr(t, "CS_NO_ACTIVITIES_FOUND", "No activities found")}
        </div>
      ) : (
        <div className="livelihood-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "CS_ACTIVITY_TYPE", "Activity Type")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "PROJECT_ID", "Project ID")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ACTIVITY_ID", "Activity ID")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ACTIVITY_START_DATE", "Start Date")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ACTIVITY_END_DATE", "End Date")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ACTIVITY_REPORT", "Report")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity, index) => {
                  const detailsPath = euActivityDetailPath(facilityId, activity.id);

                  return (
                    <tr
                      key={activity.id}
                      className={index % 2 === 1 ? "border-b border-border/70 bg-accent" : "border-b border-border/70"}
                    >
                      <td className="px-5 py-4 text-foreground">{activity.activityType || "-"}</td>
                      <td className="px-5 py-4 text-foreground">{activity.projectCode || "-"}</td>
                      <td className="px-5 py-4 text-foreground">{activity.fieldPlanCode || "-"}</td>
                      <td className="px-5 py-4 text-foreground">{activity.activityStartDate || "-"}</td>
                      <td className="px-5 py-4 text-foreground">{activity.activityEndDate || "-"}</td>
                      <td className="px-5 py-4">
                        <Link to={detailsPath} className="font-semibold text-primary hover:underline">
                          {translateOr(t, "VIEW_REPORTS", "View Reports")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalCount > 0 ? (
        <Pagination
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
      ) : null}
    </div>
  );
}
