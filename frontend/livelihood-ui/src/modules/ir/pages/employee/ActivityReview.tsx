import { employeeHomePath, reloadModule, translateOr, useAuthStore, useTranslate } from "@/shared";
import { TopBar, toast } from "@/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuditTrailTimeline } from "../../components/review/AuditTrailTimeline";
import { ConfirmActionDialog } from "../../components/review/ConfirmActionDialog";
import { ActivityInfoCard } from "../../components/review/ActivityInfoCard";
import type { RejectionReasonDraft } from "../../components/review/RejectionReasonDialog";
import { ReviewActionBar } from "../../components/review/ReviewActionBar";
import { ReviewSections } from "../../components/review/ReviewSections";
import {
  useActivityReview,
  useLoadSectionMedia,
  useSubmitActivityReview,
} from "../../hooks/use-activity-review";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import { useRejectionReasonOptions } from "../../hooks/use-rejection-reason-options";
import type {
  RejectionReasonEntry,
  ReviewDecisionAction,
  ReviewSectionId,
  SectionRejectionReasons,
} from "../../types/activity-review";
import { hasIrAccess } from "../../utils/access";
import { irActivitiesPath, irInstallationPlansPath } from "../../utils/paths";

// The review route's path is computed at runtime via contextPath(), so
// there's no static `Route` export for typed params — read plan/activity ids
// from the URL segments directly, same convention as ComplaintDetailsPage.
function useActivityReviewRouteParams() {
  return useMemo(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const plansIndex = segments.indexOf("installation-plans");
    const activitiesIndex = segments.indexOf("activities");
    return {
      planId: plansIndex >= 0 ? (segments[plansIndex + 1] ?? "") : "",
      activityId: activitiesIndex >= 0 ? (segments[activitiesIndex + 1] ?? "") : "",
    };
  }, []);
}

export function ActivityReview() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { planId, activityId } = useActivityReviewRouteParams();
  const { data: detail, isLoading } = useActivityReview(activityId);
  const submitReview = useSubmitActivityReview(activityId);
  const loadSectionMedia = useLoadSectionMedia(activityId, detail?.activity.facilityName ?? "");
  const { data: reasonOptions = [] } = useRejectionReasonOptions();
  const [rejectionReasons, setRejectionReasons] = useState<SectionRejectionReasons>({});
  const [pendingAction, setPendingAction] = useState<ReviewDecisionAction | null>(null);
  const { data: plansData } = useInstallationPlans({ fieldPlanIds: planId ? [planId] : undefined });
  const planName = plansData?.plans.find((plan) => plan.planId === planId)?.planName ?? planId;

  // Boundary names (BOUNDARY_<code>, e.g. an asset's boundaryCode) live in
  // the "livelihood" localization module, which — like every module — is
  // cached in localStorage and never refetched on its own. A boundary
  // created after this browser's cache was written would show its raw code
  // forever otherwise, so force a fresh fetch each time a reviewer opens a
  // review page.
  useEffect(() => {
    void reloadModule("livelihood");
  }, []);

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  const canEditReasons = detail?.activity.status === "SUBMITTED_BY_FIELD_STAFF";
  const hasAnyReason = Object.values(rejectionReasons).some((entries) => entries && entries.length > 0);

  function handleAddReason(sectionId: ReviewSectionId, entry: RejectionReasonDraft) {
    const newEntry: RejectionReasonEntry = { id: crypto.randomUUID(), ...entry };
    setRejectionReasons((prev) => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] ?? []), newEntry],
    }));
  }

  function handleEditReason(
    sectionId: ReviewSectionId,
    reasonId: string,
    entry: RejectionReasonDraft,
  ) {
    setRejectionReasons((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).map((reason) =>
        reason.id === reasonId ? { ...reason, ...entry } : reason,
      ),
    }));
  }

  function handleRemoveReason(sectionId: ReviewSectionId, reasonId: string) {
    setRejectionReasons((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).filter((reason) => reason.id !== reasonId),
    }));
  }

  function handleConfirmedSubmit() {
    const action = pendingAction;
    if (!action || !detail) {
      return;
    }
    submitReview.mutate(
      {
        activityId,
        action,
        rejectionReasons: action === "REJECT" ? rejectionReasons : undefined,
        documents: detail.workflowDocuments,
      },
      {
        onSuccess: () => {
          setPendingAction(null);
          toast.success(
            action === "APPROVE"
              ? translateOr(t, "ES_IR_APPROVED_SUCCESS", "Report approved")
              : translateOr(t, "ES_IR_REJECTED_SUCCESS", "Report rejected"),
          );
          void navigate({ to: irActivitiesPath(planId) });
        },
      },
    );
  }

  const showActionBar = Boolean(detail && canEditReasons);

  return (
    // `SidebarInset` (in AppShell) is the element that owns the rounded
    // bottom-left corner and the padding that insets content away from the
    // sidebar — a `fixed`/`sticky` footer that escapes it can only
    // approximate that geometry with hardcoded offsets, and a curve can't be
    // approximated with padding. So instead of leaving SidebarInset's own
    // box, this page becomes its own bounded flex column filling that box:
    // the section content scrolls in an *inner* region, and the action bar
    // is a plain sibling below it — always on-screen without scrolling,
    // and automatically inside SidebarInset's padded, rounded shape.
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
        <TopBar
          title={detail?.activity.facilityName ?? ""}
          breadcrumbs={[
            { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
            {
              label: translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans"),
              to: irInstallationPlansPath(),
            },
            { label: planName, to: irActivitiesPath(planId) },
            { label: detail?.activity.facilityName ?? "" },
          ]}
        />

        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            {translateOr(t, "CORE_COMMON_LOADING", "Loading...")}
          </div>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground">
            {translateOr(t, "ES_IR_ACTIVITY_NOT_FOUND", "This activity could not be found.")}
          </p>
        ) : (
          <>
            <ActivityInfoCard activity={detail.activity} />
            <AuditTrailTimeline checkpoints={detail.auditTrail} />
            <ReviewSections
              sections={detail.sections}
              sectionDocuments={detail.sectionDocuments}
              loadSectionMedia={loadSectionMedia}
              reasonOptions={reasonOptions}
              rejectionReasons={rejectionReasons}
              canEditReasons={canEditReasons}
              onAddReason={handleAddReason}
              onEditReason={handleEditReason}
              onRemoveReason={handleRemoveReason}
            />
          </>
        )}
      </div>

      {showActionBar ? (
        <div className="shrink-0 pt-4">
          <ReviewActionBar
            hasAnyReason={hasAnyReason}
            isSubmitting={submitReview.isPending}
            onApprove={() => setPendingAction("APPROVE")}
            onReject={() => setPendingAction("REJECT")}
          />
        </div>
      ) : null}

      <ConfirmActionDialog
        action={pendingAction}
        isSubmitting={submitReview.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleConfirmedSubmit}
      />
    </div>
  );
}
