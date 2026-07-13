import { translateOr, useTranslate } from "@/shared";
import { Skeleton } from "@/ui";
import type { ImInboxFilters, InboxDataResult } from "../../types/inbox";
import { ComplaintTable } from "./ComplaintTable";
import { InboxFilter } from "./InboxFilter";
import { InboxPagination } from "./InboxPagination";

interface DesktopInboxProps {
  data?: InboxDataResult;
  isLoading: boolean;
  onFilterChange: (filters: ImInboxFilters) => void;
  searchParams: {
    filters?: ImInboxFilters;
  };
  onNextPage: () => void;
  onPrevPage: () => void;
  currentPage: number;
  totalRecords: number;
  pageSizeLimit: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function DesktopInbox({
  data,
  isLoading,
  onFilterChange,
  searchParams,
  onNextPage,
  onPrevPage,
  currentPage,
  totalRecords,
  pageSizeLimit,
  onPageChange,
  onPageSizeChange,
}: DesktopInboxProps) {
  const { t } = useTranslate();

  return (
    <div className="space-y-5">
      <InboxFilter
        complaints={data}
        onFilterChange={onFilterChange}
        searchParams={searchParams}
      />

      <div className="livelihood-card overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : data && data.combinedRes.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            {translateOr(t, "CS_INBOX_NOTHING_TO_SHOW", "No Tickets Found")}
          </div>
        ) : data?.combinedRes?.length ? (
          <ComplaintTable data={data.combinedRes} />
        ) : (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            {translateOr(t, "CS_COMMON_ERROR_LOADING_RESULTS", "Unable to load results")}
          </div>
        )}
      </div>

      {totalRecords > 0 ? (
        <InboxPagination
          currentPage={currentPage}
          totalRecords={totalRecords}
          pageSizeLimit={pageSizeLimit}
          onNextPage={onNextPage}
          onPrevPage={onPrevPage}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </div>
  );
}
