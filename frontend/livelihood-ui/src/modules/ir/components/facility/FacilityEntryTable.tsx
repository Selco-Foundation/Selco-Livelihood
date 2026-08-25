import { translateOr, useTranslate } from "@/shared";
import { Button, Checkbox, Skeleton, cn } from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { FacilityEntry } from "../../types/facility-review";
import { irFacilityReviewPath } from "../../utils/paths";
import {
  FacilityEntryFilter,
  type FacilityEntryFilterState,
  type FacilityFilterOption,
} from "./FacilityEntryFilter";

function dedupeBoundaries(
  entries: FacilityEntry[],
  key: "district" | "block",
): FacilityFilterOption[] {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const boundary = entry[key];
    if (boundary?.code && !seen.has(boundary.code)) {
      seen.set(boundary.code, boundary.name ?? boundary.code);
    }
  }
  return Array.from(seen.entries()).map(([code, name]) => ({ code, name }));
}

interface FacilityEntryTableProps {
  planId: string;
  entries: FacilityEntry[];
  isLoading: boolean;
  onBulkApprove: (entryIds: string[]) => void;
  isBulkApproving: boolean;
}

export function FacilityEntryTable({
  planId,
  entries,
  isLoading,
  onBulkApprove,
  isBulkApproving,
}: FacilityEntryTableProps) {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FacilityEntryFilterState>({ district: [], block: [] });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const districtOptions = useMemo(() => dedupeBoundaries(entries, "district"), [entries]);
  const blockOptions = useMemo(() => dedupeBoundaries(entries, "block"), [entries]);

  const filtered = entries.filter(
    (entry) =>
      (filters.district.length === 0 ||
        (entry.district?.code && filters.district.includes(entry.district.code))) &&
      (filters.block.length === 0 ||
        (entry.block?.code && filters.block.includes(entry.block.code))),
  );

  const selectableIds = filtered
    .filter((entry) => entry.status === "SUBMITTED_BY_SUPERVISOR")
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
        onFilterChange={setFilters}
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

      {filtered.length === 0 ? (
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
                {filtered.map((entry, index) => {
                  const reviewPath = irFacilityReviewPath(planId, entry.entryId);
                  const isSelectable = entry.status === "SUBMITTED_BY_SUPERVISOR";

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
                        {[entry.district?.name, entry.block?.name].filter(Boolean).join(" / ")}
                      </td>
                      <td className="px-5 py-4">
                        {entry.status === "SUBMITTED_BY_SUPERVISOR" ? (
                          <span className="livelihood-sla-badge">
                            {translateOr(t, "ES_IR_STATUS_PENDING", "Pending Review")}
                          </span>
                        ) : entry.status === "REJECTED" ? (
                          <span className="text-sm font-medium text-destructive">
                            {translateOr(t, "ES_IR_STATUS_REJECTED", "Rejected")}
                          </span>
                        ) : (
                          <span className="livelihood-sla-badge-muted">
                            {translateOr(t, "ES_IR_STATUS_APPROVED", "Approved")}
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
    </div>
  );
}
