import { employeeHomePath, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Breadcrumbs, Button, PageHeader, toast } from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ReviewActionBar } from "../../components/review/ReviewActionBar";
import { ReviewSections } from "../../components/review/ReviewSections";
import { useFacilityReview, useSubmitFacilityReview } from "../../hooks/use-facility-review";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import type { ReviewSectionId, SectionRejectionReasons } from "../../types/facility-review";
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
  const [rejectionReasons, setRejectionReasons] = useState<SectionRejectionReasons>({});
  const { data: plansData } = useInstallationPlans();
  const planName = plansData?.plans.find((plan) => plan.planId === planId)?.planName ?? planId;

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  const hasAnyReason = Object.values(rejectionReasons).some((reason) => reason?.trim());

  function handleReasonChange(sectionId: ReviewSectionId, value: string) {
    setRejectionReasons((prev) => ({ ...prev, [sectionId]: value }));
  }

  function handleSubmit(action: "APPROVE" | "REJECT") {
    submitReview.mutate(
      {
        entryId,
        action,
        rejectionReasons: action === "REJECT" ? rejectionReasons : undefined,
      },
      {
        onSuccess: () => {
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
      <div className="space-y-1">
        <PageHeader
          title={detail?.entry.facilityName ?? ""}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={irFacilityEntriesPath(planId)}>
                {translateOr(t, "ES_IR_BACK_TO_SITES", "Back to Sites")}
              </Link>
            </Button>
          }
        />
        <Breadcrumbs
          items={[
            { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
            {
              label: translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans"),
              to: irInstallationPlansPath(),
            },
            { label: planName, to: irFacilityEntriesPath(planId) },
            { label: detail?.entry.facilityName ?? "" },
          ]}
        />
      </div>

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
          <ReviewSections
            sections={detail.sections}
            rejectionReasons={rejectionReasons}
            onReasonChange={handleReasonChange}
          />
          <ReviewActionBar
            hasAnyReason={hasAnyReason}
            isSubmitting={submitReview.isPending}
            onApprove={() => handleSubmit("APPROVE")}
            onReject={() => handleSubmit("REJECT")}
          />
        </>
      )}
    </div>
  );
}
