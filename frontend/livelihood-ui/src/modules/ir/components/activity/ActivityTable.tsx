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

// Installation.InstallationTypes is MDMS-driven precisely so a new type
// (e.g. a third asset type) can be added without a frontend deploy — no
// hardcoded code→label map here. The key is built from the code itself, so
// it just needs a matching ES_IR_COMPONENT_TYPE_<CODE> translation staged
// whenever a new type shows up; the raw code is a reasonable fallback until
// then, same as any other translateOr call.
function componentTypeLabel(
  componentType: ReviewActivity["componentType"],
  t: ReturnType<typeof useTranslate>["t"],
): string {
  return translateOr(t, `ES_IR_COMPONENT_TYPE_${componentType}`, componentType);
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
  /** Scoped to whichever page is currently open — the master checkbox only
   * ever checks/unchecks this page's selectable rows, and the caller clears
   * this on every page change (see ActivityList.tsx's page handlers). */
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
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
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleAll() {
    // `selected` only ever holds this page's ids (the caller resets it on
    // every page change), so this can safely replace it wholesale rather
    // than merge.
    onSelectedChange(allSelected ? new Set() : new Set(selectableIds));
  }

  function toggleOne(activityId: string) {
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
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      disabled={selectableIds.length === 0}
                    />
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
                            checked={selected.has(activity.activityId)}
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
                        {componentTypeLabel(activity.componentType, t)}
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
