import { useTranslate } from "@/shared";
import { Card, CardContent, Skeleton } from "@/ui";
import type { ImInboxFilters, InboxDataResult } from "../../types/inbox";
import { ComplaintLinks } from "./ComplaintLinks";
import { ComplaintTable } from "./ComplaintTable";
import { InboxFilter } from "./InboxFilter";
import { InboxSearch } from "./InboxSearch";

interface DesktopInboxProps {
  data?: InboxDataResult;
  isLoading: boolean;
  onFilterChange: (filters: ImInboxFilters) => void;
  onSearch: (params: Record<string, string>) => void;
  searchParams: {
    filters?: ImInboxFilters;
    search?: Record<string, string> | string;
  };
  onNextPage: () => void;
  onPrevPage: () => void;
  currentPage: number;
  totalRecords: number;
  pageSizeLimit: number;
  onPageSizeChange: (pageSize: number) => void;
}

export function DesktopInbox({
  data,
  isLoading,
  onFilterChange,
  onSearch,
  searchParams,
  onNextPage,
  onPrevPage,
  currentPage,
  totalRecords,
  pageSizeLimit,
  onPageSizeChange,
}: DesktopInboxProps) {
  const { t } = useTranslate();

  let content;
  if (isLoading) {
    content = <Skeleton className="h-64 w-full" />;
  } else if (data && data.combinedRes.length === 0) {
    content = (
      <Card>
        <CardContent className="py-10 text-center text-[#7a2824]">
          {t("CS_INBOX_NOTHING_TO_SHOW")}
        </CardContent>
      </Card>
    );
  } else if (data?.combinedRes?.length) {
    content = (
      <ComplaintTable
        data={data.combinedRes}
        currentPage={currentPage}
        totalRecords={totalRecords}
        pageSizeLimit={pageSizeLimit}
        onNextPage={onNextPage}
        onPrevPage={onPrevPage}
        onPageSizeChange={onPageSizeChange}
      />
    );
  } else {
    content = (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          {t("CS_COMMON_ERROR_LOADING_RESULTS")}
        </CardContent>
      </Card>
    );
  }

  const initialApplicationNumber =
    typeof searchParams.search === "object" && searchParams.search
      ? searchParams.search.applicationNumber
      : "";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex shrink-0 flex-col gap-4">
        <ComplaintLinks />
        <InboxFilter
          complaints={data}
          onFilterChange={onFilterChange}
          searchParams={searchParams}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-4 overflow-x-auto">
        <InboxSearch onSearch={onSearch} initialApplicationNumber={initialApplicationNumber} />
        <div>{content}</div>
      </div>
    </div>
  );
}
