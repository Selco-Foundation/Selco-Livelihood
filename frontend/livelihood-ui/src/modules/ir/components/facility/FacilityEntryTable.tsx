import { translateOr, useTranslate } from "@/shared";
import { Button, Checkbox, Pagination, Skeleton, cn } from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  FACILITY_ENTRY_STATUS_LABELS,
  facilityStatusBadgeVariant,
} from "../../constants/facility-status";
import type { FacilityEntry } from "../../types/facility-review";
import { boundaryDisplayName } from "../../utils/boundary";
import { irFacilityReviewPath } from "../../utils/paths";
import {
  FacilityEntryFilter,
  type FacilityEntryFilterState,
  type FacilityFilterOption,
} from "./FacilityEntryFilter";

function statusLabel(
  status: FacilityEntry["status"],
  t: ReturnType<typeof useTranslate>["t"],
): string {
  const label = FACILITY_ENTRY_STATUS_LABELS[status];
  return translateOr(t, label.key, label.fallback);
}

function boundaryLabel(
  boundary: { code: string; name?: string } | undefined,
  t: ReturnType<typeof useTranslate>["t"],
): string | undefined {
  if (!boundary) {
    return undefined;
  }
  return boundary.name ?? boundaryDisplayName(boundary.code, t);
}

interface FacilityEntryTableProps {
  planId: string;
  entries: FacilityEntry[];
  isLoading: boolean;
  districtOptions: FacilityFilterOption[];
  blockOptions: FacilityFilterOption[];
  statusOptions: FacilityFilterOption[];
  filters: FacilityEntryFilterState;
  searchText: string;
  onFilterChange: (filters: FacilityEntryFilterState) => void;
  onSearchTextChange: (searchText: string) => void;
  onBulkApprove: (entryIds: string[]) => void;
  isBulkApproving: boolean;
  currentPage: number;
  totalRecords: number;
  pageSizeLimit: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function FacilityEntryTable({
  planId,
  entries,
  isLoading,
  districtOptions,
  blockOptions,
  statusOptions,
  filters,
  searchText,
  onFilterChange,
  onSearchTextChange,
  onBulkApprove,
  isBulkApproving,
  currentPage,
  totalRecords,
  pageSizeLimit,
  onNextPage,
  onPrevPage,
  onPageChange,
  onPageSizeChange,
}: FacilityEntryTableProps) {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectableIds = entries
    .filter((entry) => entry.status === "SUBMITTED_BY_FIELD_STAFF")
    .map((entry) => entry.entryId);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  function toggleOne(entryId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }

  function downloadCurrentPageEntries() {
    const headers = ["Facility", "Type", "Location", "Status"];
    const rows = entries.map((entry) => [
      entry.facilityName,
      entry.entryType === "MACHINE"
        ? translateOr(t, "ES_IR_ENTRY_TYPE_MACHINE", "Machine")
        : translateOr(t, "ES_IR_ENTRY_TYPE_SOLAR", "Solar"),
      [boundaryLabel(entry.district, t), boundaryLabel(entry.block, t)].filter(Boolean).join(" / "),
      statusLabel(entry.status, t),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${planId}-review-sites.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="livelihood-card p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FacilityEntryFilter
        districtOptions={districtOptions}
        blockOptions={blockOptions}
        statusOptions={statusOptions}
        filters={filters}
        searchText={searchText}
        onFilterChange={onFilterChange}
        onSearchTextChange={onSearchTextChange}
        onDownload={downloadCurrentPageEntries}
      />

      {selected.size > 0 ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={isBulkApproving}
            onClick={() => {
              onBulkApprove(Array.from(selected));
              setSelected(new Set());
            }}
          >
            {translateOr(t, "ES_IR_BULK_APPROVE", "Approve Selected")} ({selected.size})
          </Button>
        </div>
      ) : null}

      {entries.length === 0 ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {translateOr(t, "ES_IR_NO_SITES", "No sites found for this plan")}
        </div>
      ) : (
        <div className="livelihood-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 px-5 py-3">
                    {selectableIds.length > 0 ? (
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    ) : null}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ES_IR_FACILITY", "Facility")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ES_IR_ENTRY_TYPE", "Type")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ES_IR_LOCATION", "Location")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ES_IR_STATUS", "Status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const reviewPath = irFacilityReviewPath(planId, entry.entryId);
                  const isSelectable = entry.status === "SUBMITTED_BY_FIELD_STAFF";
                  const badgeVariant = facilityStatusBadgeVariant(entry.status);

                  return (
                    <tr
                      key={entry.entryId}
                      className={cn(
                        "cursor-pointer border-b border-border/70 hover:bg-muted/40",
                        index % 2 === 1 && "bg-accent",
                      )}
                      onClick={() => {
                        navigate({ to: reviewPath }).catch(() => {});
                      }}
                    >
                      <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                        {isSelectable ? (
                          <Checkbox
                            checked={selected.has(entry.entryId)}
                            onCheckedChange={() => toggleOne(entry.entryId)}
                          />
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to={reviewPath}
                          className="font-semibold text-foreground hover:text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {entry.facilityName}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {entry.entryType === "MACHINE"
                          ? translateOr(t, "ES_IR_ENTRY_TYPE_MACHINE", "Machine")
                          : translateOr(t, "ES_IR_ENTRY_TYPE_SOLAR", "Solar")}
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {[boundaryLabel(entry.district, t), boundaryLabel(entry.block, t)]
                          .filter(Boolean)
                          .join(" / ")}
                      </td>
                      <td className="px-5 py-4">
                        {badgeVariant === "pending" ? (
                          <span className="livelihood-sla-badge">
                            {statusLabel(entry.status, t)}
                          </span>
                        ) : badgeVariant === "rejected" ? (
                          <span className="text-sm font-medium text-destructive">
                            {statusLabel(entry.status, t)}
                          </span>
                        ) : badgeVariant === "approved" ? (
                          <span className="livelihood-sla-badge-muted">
                            {statusLabel(entry.status, t)}
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">
                            {statusLabel(entry.status, t)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
