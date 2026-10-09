import { translateOr, useTranslate } from "@/shared";
import { Pagination, Skeleton } from "@/ui";
import { boundaryDisplayName } from "../../utils/boundary";
import type { BoundaryRow } from "../../types/boundary";

interface BoundaryTableProps {
  boundaries: BoundaryRow[];
  isLoading: boolean;
  currentPage: number;
  totalRecords: number;
  pageSizeLimit: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function BoundaryTable({
  boundaries,
  isLoading,
  currentPage,
  totalRecords,
  pageSizeLimit,
  onNextPage,
  onPrevPage,
  onPageChange,
  onPageSizeChange,
}: BoundaryTableProps) {
  const { t } = useTranslate();

  if (isLoading) {
    return (
      <div className="livelihood-card p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {boundaries.length === 0 ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {translateOr(t, "CORE_COMMON_NO_BOUNDARIES_FOUND", "No boundaries found")}
        </div>
      ) : (
        <div className="livelihood-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "CS_COUNTRY", "Country")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "CS_STATE", "State")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "CS_DISTRICT", "District")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "CS_BLOCK", "Block")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "CS_CODE", "Code")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {boundaries.map((boundary, index) => (
                  <tr
                    key={boundary.code}
                    className={index % 2 === 1 ? "border-b border-border/70 bg-accent" : "border-b border-border/70"}
                  >
                    <td className="px-5 py-4 text-foreground">
                      {boundary.countryCode ? boundaryDisplayName(boundary.countryCode, t) : "-"}
                    </td>
                    <td className="px-5 py-4 text-foreground">
                      {boundary.stateCode ? boundaryDisplayName(boundary.stateCode, t) : "-"}
                    </td>
                    <td className="px-5 py-4 text-foreground">
                      {boundary.districtCode ? boundaryDisplayName(boundary.districtCode, t) : "-"}
                    </td>
                    <td className="px-5 py-4 text-foreground">
                      {boundary.blockCode ? boundaryDisplayName(boundary.blockCode, t) : "-"}
                    </td>
                    <td className="px-5 py-4 text-foreground">{boundary.code || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalRecords > 0 ? (
        <Pagination
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
