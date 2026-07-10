import { useTranslate } from "@/shared";
import { cn } from "@/ui";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

function translateOr(
  t: (key: string) => string,
  key: string,
  fallback: string,
): string {
  const value = t(key);
  return value === key ? fallback : value;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface InboxPaginationProps {
  currentPage: number;
  totalRecords: number;
  pageSizeLimit: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function InboxPagination({
  currentPage,
  totalRecords,
  pageSizeLimit,
  onNextPage,
  onPrevPage,
  onPageChange,
  onPageSizeChange,
}: InboxPaginationProps) {
  const { t } = useTranslate();
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSizeLimit));
  const canGoPrev = currentPage > 0;
  const canGoNext = (currentPage + 1) * pageSizeLimit < totalRecords;
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor="inbox-page-size">
          {translateOr(t, "ES_IM_ITEMS_PER_PAGE", "Items per Page")}
        </label>
        <div className="relative">
          <select
            id="inbox-page-size"
            className="livelihood-filter-select h-8 w-auto pr-7"
            value={pageSizeLimit}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size} className="cursor-pointer">
                {size}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={onPrevPage}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
          {t("CS_COMMON_PREVIOUS")}
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-md text-sm transition-colors",
              page === currentPage
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {page + 1}
          </button>
        ))}

        <button
          type="button"
          disabled={!canGoNext}
          onClick={onNextPage}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          {t("CS_COMMON_NEXT")}
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
