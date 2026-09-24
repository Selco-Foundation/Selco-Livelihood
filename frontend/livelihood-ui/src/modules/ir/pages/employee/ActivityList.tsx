import {
  employeeHomePath,
  extractApiErrorMessage,
  translateOr,
  useAuthStore,
  useBoundary,
  useDebouncedValue,
  useTranslate,
} from "@/shared";
import { TopBar, toast } from "@/ui";
import { useEffect, useMemo, useState } from "react";
import { ActivityTable } from "../../components/activity/ActivityTable";
import { ConfirmBulkApproveDialog } from "../../components/activity/ConfirmBulkApproveDialog";
import {
  EMPTY_ACTIVITY_FILTERS,
  ActivityFilter,
  type ActivityFilterState,
  type ActivityFilterOption,
} from "../../components/activity/ActivityFilter";
import { useBulkApproveActivities, useActivities } from "../../hooks/use-activities";
import { useActivityStatusOptions } from "../../hooks/use-activity-status-options";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import { boundaryDisplayName, cascadeBlockOptions, resolveBoundaryCodes } from "../../utils/boundary";
import { hasIrAccess } from "../../utils/access";
import { irInstallationPlansPath } from "../../utils/paths";

const DEFAULT_PAGE_SIZE = 10;

// The activities route's path is computed at runtime via contextPath(), so
// there's no static `Route` export for typed params — read the plan id from
// the URL segments directly instead, same convention as ComplaintDetailsPage.
function useActivitiesRouteParams() {
  return useMemo(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const index = segments.indexOf("installation-plans");
    return { planId: index >= 0 ? (segments[index + 1] ?? "") : "" };
  }, []);
}

export function ActivityList() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { planId } = useActivitiesRouteParams();

  const [filters, setFilters] = useState<ActivityFilterState>(EMPTY_ACTIVITY_FILTERS);
  const [rawSearchText, setRawSearchText] = useState("");
  const searchText = useDebouncedValue(rawSearchText);
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkApproveConfirmOpen, setBulkApproveConfirmOpen] = useState(false);

  // Scoped to this one field plan via fieldPlanIds — the authoritative source
  // for breadcrumb/summary data and the field plan's state (which seeds the
  // boundary lookup below), independent of the activity search's own
  // filters/pagination.
  const { data: plansData } = useInstallationPlans({ fieldPlanIds: planId ? [planId] : undefined });
  const plan = plansData?.plans.find((item) => item.planId === planId);
  const planName = plan?.planName ?? planId;
  const startDate = plan?.startDate ?? "-";
  const endDate = plan?.endDate ?? "-";

  // Fetches every district/block in the state — District/Block filter
  // *options* are then narrowed down from this full list to just the ones
  // actually part of this field plan (below), rather than showing the
  // whole state's boundaries.
  const { data: boundaryData } = useBoundary(plan?.stateCodes ?? []);

  const planBlockCodes = new Set(plan?.blockCodes ?? []);
  const planBlocks = (boundaryData?.blocks ?? []).filter((block) => planBlockCodes.has(block.code));

  useEffect(() => {
    setPageOffset(0);
  }, [searchText]);

  const boundaryCodes = resolveBoundaryCodes(filters, boundaryData?.blocks ?? [], boundaryData?.facilities ?? []);

  const { data, isLoading } = useActivities(planId, {
    boundaryCodes,
    statuses: filters.status.length > 0 ? filters.status : undefined,
    searchText,
    pageOffset,
    pageSize,
  });

  const bulkApprove = useBulkApproveActivities(planId);
  const { options: statusOptions } = useActivityStatusOptions();

  const planDistrictCodes = new Set(plan?.districtCodes ?? []);
  const districtOptions: ActivityFilterOption[] = (boundaryData?.districts ?? [])
    .filter((district) => planDistrictCodes.has(district.code))
    .map((district) => ({ code: district.code, name: boundaryDisplayName(district.code, t) }));
  const blockOptions: ActivityFilterOption[] = cascadeBlockOptions(
    planBlocks,
    filters.district,
  ).map((block) => ({ code: block.code, name: boundaryDisplayName(block.code, t) }));

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  const totalCount = data?.totalCount ?? 0;
  const currentPage = Math.floor(pageOffset / pageSize);

  function handleFilterChange(nextFilters: ActivityFilterState) {
    // Selecting a district can invalidate an already-selected block from a
    // different district — prune it, matching im's InboxFilter cascade.
    const validBlockCodes = new Set(
      cascadeBlockOptions(planBlocks, nextFilters.district).map((block) => block.code),
    );
    setFilters({
      ...nextFilters,
      block: nextFilters.block.filter((code) => validBlockCodes.has(code)),
    });
    // A selection made under one filter set shouldn't silently carry over to
    // rows a *different* filter set surfaces — the user can no longer see
    // what they'd be bulk-approving.
    setSelected(new Set());
    setPageOffset(0);
  }

  function runBulkApprove() {
    bulkApprove.mutate(
      { activityIds: Array.from(selected) },
      {
        onSuccess: (result) => {
          setSelected(new Set());
          setBulkApproveConfirmOpen(false);
          const failedCount = result.data.failedProjectIDs?.length ?? 0;
          if (failedCount > 0) {
            // A 207 response still resolves (not an error) — the backend
            // approved some and failed others in the same batch, so this
            // isn't a plain success or a plain failure.
            toast.warning(
              translateOr(t, "ES_IR_BULK_APPROVE_PARTIAL_SUCCESS_PREFIX", "Approved, but") +
                ` ${failedCount} ` +
                translateOr(
                  t,
                  "ES_IR_BULK_APPROVE_PARTIAL_SUCCESS_SUFFIX",
                  "activities could not be approved.",
                ),
            );
          } else {
            toast.success(translateOr(t, "ES_IR_BULK_APPROVE_SUCCESS", "Activities approved"));
          }
        },
        onError: (error) => {
          toast.error(translateOr(t, "ES_IR_BULK_APPROVE_FAILED", "Failed to approve activities"), {
            description:
              extractApiErrorMessage(error) ??
              translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again."),
          });
        },
      },
    );
  }

  function handleBulkApprove() {
    setBulkApproveConfirmOpen(true);
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={translateOr(t, "ES_IR_REVIEW_ACTIVITIES", "Review Activities")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          {
            label: translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans"),
            to: irInstallationPlansPath(),
          },
          { label: planName },
        ]}
      />
      <div className="livelihood-card grid gap-6 px-6 py-5 sm:grid-cols-3 sm:px-7">
        <div>
          <p className="text-sm leading-[21px] text-ink-600">
            {translateOr(t, "ES_IR_START_DATE", "Start Date")}
          </p>
          <p className="text-base leading-6 font-semibold text-ink-950">{startDate}</p>
        </div>
        <div>
          <p className="text-sm leading-[21px] text-ink-600">
            {translateOr(t, "ES_IR_COMPLETION_DATE", "Completion Date")}
          </p>
          <p className="text-base leading-6 font-semibold text-ink-950">{endDate}</p>
        </div>
        <div>
          <p className="text-sm leading-[21px] text-ink-600">
            {translateOr(t, "ES_IR_TOTAL_ACTIVITIES", "Activities")}
          </p>
          <p className="text-base leading-6 font-semibold text-ink-950">
            {plan?.totalFacilities ?? "-"}
          </p>
        </div>
      </div>
      <ActivityFilter
        districtOptions={districtOptions}
        blockOptions={blockOptions}
        statusOptions={statusOptions}
        filters={filters}
        searchText={rawSearchText}
        onFilterChange={handleFilterChange}
        onSearchTextChange={(value) => {
          setRawSearchText(value);
          setSelected(new Set());
        }}
        selectedCount={selected.size}
        onApprove={handleBulkApprove}
        isApproving={bulkApprove.isPending}
      />
      <ActivityTable
        planId={planId}
        activities={data?.activities ?? []}
        isLoading={isLoading}
        selected={selected}
        onSelectedChange={setSelected}
        currentPage={currentPage}
        totalRecords={totalCount}
        pageSizeLimit={pageSize}
        onNextPage={() => {
          setPageOffset(pageOffset + pageSize);
          setSelected(new Set());
        }}
        onPrevPage={() => {
          setPageOffset(Math.max(0, pageOffset - pageSize));
          setSelected(new Set());
        }}
        onPageChange={(page) => {
          setPageOffset(page * pageSize);
          setSelected(new Set());
        }}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageOffset(0);
          setSelected(new Set());
        }}
      />
      <ConfirmBulkApproveDialog
        open={bulkApproveConfirmOpen}
        count={selected.size}
        isSubmitting={bulkApprove.isPending}
        onCancel={() => setBulkApproveConfirmOpen(false)}
        onConfirm={runBulkApprove}
      />
    </div>
  );
}
