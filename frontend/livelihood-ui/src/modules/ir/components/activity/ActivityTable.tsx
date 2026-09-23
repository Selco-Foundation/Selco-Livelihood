import { translateOr, useTranslate } from "@/shared";
import { Checkbox, Pagination, Skeleton, cn } from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ACTIVITY_STATUS_LABELS,
  activityStatusBadgeVariant,
} from "../../constants/activity-status";
import type { ReviewActivity } from "../../types/activity-review";
import { boundaryDisplayName } from "../../utils/boundary";
import { irActivityReviewPath } from "../../utils/paths";

function statusLabel(
  status: ReviewActivity["status"],
  t: ReturnType<typeof useTranslate>["t"],
): string {
  const label = ACTIVITY_STATUS_LABELS[status];
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

interface ActivityTableProps {
  planId: string;
  activities: ReviewActivity[];
  isLoading: boolean;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
  /** True once the master checkbox has switched into "every activity
   * matching the current filters, across every page" mode (qc's `mainCheck`
   * semantics) — see hooks/use-activities.ts's BulkApproveInput. Distinct
   * from `selected`, which only ever tracks specific row ids. */
  isAllSelected: boolean;
  onIsAllSelectedChange: (value: boolean) => void;
  /** Disables the master checkbox when it's cheaply provable nothing on any
   * page could be approvable (see ActivityList.tsx's noApprovableActivities). */
  disabled: boolean;
  currentPage: number;
  totalRecords: number;
  pageSizeLimit: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function ActivityTable({
  planId,
  activities,
  isLoading,
  selected,
  onSelectedChange,
  isAllSelected,
  onIsAllSelectedChange,
  disabled,
  currentPage,
  totalRecords,
  pageSizeLimit,
  onNextPage,
  onPrevPage,
  onPageChange,
  onPageSizeChange,
}: ActivityTableProps) {
  const { t } = useTranslate();
  const navigate = useNavigate();

  const selectableIds = activities
    .filter((activity) => activity.status === "SUBMITTED_BY_FIELD_STAFF")
    .map((activity) => activity.activityId);
  const allSelected =
    isAllSelected || (selectableIds.length > 0 && selectableIds.every((id) => selected.has(id)));

  function toggleAll() {
    // Branch on the visual `allSelected` state, not `isAllSelected` — every
    // row on this page can already be individually checked (allSelected
    // true) while isAllSelected is still false, and clicking the checkbox
    // then means "clear", not "expand to every page".
    if (allSelected) {
      onIsAllSelectedChange(false);
      onSelectedChange(new Set());
      return;
    }
    if (selectableIds.length === 0) {
      return;
    }
    onIsAllSelectedChange(true);
    onSelectedChange(new Set(selectableIds));
  }

  function toggleOne(activityId: string) {
    if (isAllSelected) {
      // Can't express "everything except this one" to the backend — no
      // exclusion-list field exists on the bulk-approve contract. Degrade to
      // an explicit selection scoped to this page: everything currently
      // selectable here, minus the row just excluded.
      onIsAllSelectedChange(false);
      onSelectedChange(new Set(selectableIds.filter((id) => id !== activityId)));
      return;
    }
    const next = new Set(selected);
    if (next.has(activityId)) {
      next.delete(activityId);
    } else {
      next.add(activityId);
    }
    onSelectedChange(next);
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
      {activities.length === 0 ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {translateOr(t, "ES_IR_NO_ACTIVITIES", "No activities found for this plan")}
        </div>
      ) : (
        <div className="livelihood-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 px-5 py-3">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} disabled={disabled} />
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ES_IR_END_USER", "End User")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ES_IR_COMPONENT_TYPE", "Type")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ES_IR_DISTRICT", "District")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ES_IR_BLOCK", "Block")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ES_IR_STATUS", "Status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity, index) => {
                  const reviewPath = irActivityReviewPath(planId, activity.activityId);
                  const isSelectable = activity.status === "SUBMITTED_BY_FIELD_STAFF";
                  const badgeVariant = activityStatusBadgeVariant(activity.status);

                  return (
                    <tr
                      key={activity.activityId}
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
                            checked={isAllSelected || selected.has(activity.activityId)}
                            onCheckedChange={() => toggleOne(activity.activityId)}
                          />
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to={reviewPath}
                          className="font-semibold text-foreground hover:text-primary hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {activity.facilityName}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {activity.componentType === "MACHINE"
                          ? translateOr(t, "ES_IR_COMPONENT_TYPE_MACHINE", "Machine")
                          : translateOr(t, "ES_IR_COMPONENT_TYPE_SOLAR", "Solar")}
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {boundaryLabel(activity.district, t) ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {boundaryLabel(activity.block, t) ?? "-"}
                      </td>
                      <td className="px-5 py-4">
                        {badgeVariant === "pending" ? (
                          <span className="livelihood-sla-badge">
                            {statusLabel(activity.status, t)}
                          </span>
                        ) : badgeVariant === "rejected" ? (
                          <span className="text-sm font-medium text-destructive">
                            {statusLabel(activity.status, t)}
                          </span>
                        ) : badgeVariant === "approved" ? (
                          <span className="livelihood-sla-badge-muted">
                            {statusLabel(activity.status, t)}
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">
                            {statusLabel(activity.status, t)}
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
