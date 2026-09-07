import { cn } from "@/ui";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface ProjectsPaginationProps {
  currentPage: number;
  totalRecords: number;
  pageSizeLimit: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function ProjectsPagination({
  currentPage,
  totalRecords,
  pageSizeLimit,
  onPageChange,
  onPageSizeChange,
}: ProjectsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSizeLimit));
  const canGoPrev = currentPage > 0;
  const canGoNext = (currentPage + 1) * pageSizeLimit < totalRecords;
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor="projects-page-size">Items per Page</label>
        <div className="relative">
          <select
            id="projects-page-size"
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
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1 text-sm font-medium text-ink-950 transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} />
          Previous
        </button>

        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={cn(
                "flex h-8 w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-sm font-medium transition-colors",
                page === currentPage
                  ? "bg-primary-700 text-neutral-25"
                  : "border border-neutral-300 bg-neutral-100 text-neutral-700 hover:border-primary-200 hover:bg-primary-100",
              )}
            >
              {page + 1}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1 text-sm font-medium text-ink-950 transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          Next
          <ArrowRight className="size-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
