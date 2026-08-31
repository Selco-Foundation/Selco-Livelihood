import { employeeHomePath, translateOr, useAuthStore, useTranslate } from "@/shared";
import { TopBar, toast } from "@/ui";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AuditTrailTimeline } from "../../components/review/AuditTrailTimeline";
import { ConfirmActionDialog } from "../../components/review/ConfirmActionDialog";
import { FacilityInfoCard } from "../../components/review/FacilityInfoCard";
import type { RejectionReasonDraft } from "../../components/review/RejectionReasonDialog";
import { ReviewActionBar } from "../../components/review/ReviewActionBar";
import { ReviewSections } from "../../components/review/ReviewSections";
import {
  useFacilityReview,
  useRejectionReasonOptions,
  useSubmitFacilityReview,
} from "../../hooks/use-facility-review";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import type {
  RejectionReasonEntry,
  ReviewDecisionAction,
  ReviewSectionId,
  SectionRejectionReasons,
} from "../../types/facility-review";
import { hasIrAccess } from "../../utils/access";
import { irFacilityEntriesPath, irInstallationPlansPath } from "../../utils/paths";

// The review route's path is computed at runtime via contextPath(), so there's no
// static `Route` export for typed params — read plan/entry ids from the URL
// segments directly, same convention as ComplaintDetailsPage.
function useFacilityReviewRouteParams() {
  return useMemo(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const index = segments.indexOf("review");
    return {
      planId: index >= 0 ? (segments[index + 1] ?? "") : "",
      entryId: index >= 0 ? (segments[index + 2] ?? "") : "",
    };
  }, []);
}

export function FacilityReviewPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { planId, entryId } = useFacilityReviewRouteParams();
  const { data: detail, isLoading } = useFacilityReview(entryId);
  const submitReview = useSubmitFacilityReview();
  const reasonOptions = useRejectionReasonOptions();
  const [rejectionReasons, setRejectionReasons] = useState<SectionRejectionReasons>({});
  const [pendingAction, setPendingAction] = useState<ReviewDecisionAction | null>(null);
  const { data: plansData } = useInstallationPlans();
  const planName = plansData?.plans.find((plan) => plan.planId === planId)?.planName ?? planId;

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  const canEditReasons = detail?.entry.status === "SUBMITTED_BY_SUPERVISOR";
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
    if (!action) {
      return;
    }
    submitReview.mutate(
      {
        entryId,
        action,
        rejectionReasons: action === "REJECT" ? rejectionReasons : undefined,
      },
      {
        onSuccess: () => {
          setPendingAction(null);
          toast.success(
            action === "APPROVE"
              ? translateOr(t, "ES_IR_APPROVED_SUCCESS", "Report approved")
              : translateOr(t, "ES_IR_REJECTED_SUCCESS", "Report rejected"),
          );
          void navigate({ to: irFacilityEntriesPath(planId) });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={detail?.entry.facilityName ?? ""}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          {
            label: translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans"),
            to: irInstallationPlansPath(),
          },
          { label: planName, to: irFacilityEntriesPath(planId) },
          { label: detail?.entry.facilityName ?? "" },
        ]}
      />

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
          {translateOr(t, "CORE_COMMON_LOADING", "Loading...")}
        </div>
      ) : !detail ? (
        <p className="text-sm text-muted-foreground">
          {translateOr(t, "ES_IR_ENTRY_NOT_FOUND", "This entry could not be found.")}
        </p>
      ) : (
        <>
          <FacilityInfoCard entry={detail.entry} />
          <AuditTrailTimeline checkpoints={detail.auditTrail} />
          <ReviewSections
            sections={detail.sections}
            reasonOptions={reasonOptions}
            rejectionReasons={rejectionReasons}
            canEditReasons={canEditReasons}
            onAddReason={handleAddReason}
            onEditReason={handleEditReason}
            onRemoveReason={handleRemoveReason}
          />
          {canEditReasons ? (
            <ReviewActionBar
              hasAnyReason={hasAnyReason}
              isSubmitting={submitReview.isPending}
              onApprove={() => setPendingAction("APPROVE")}
              onReject={() => setPendingAction("REJECT")}
            />
          ) : null}
        </>
      )}

      <ConfirmActionDialog
        action={pendingAction}
        isSubmitting={submitReview.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleConfirmedSubmit}
      />
    </div>
  );
}
