import { contextPath, employeeHomePath, useAuthStore, useTranslate } from "@/shared";
import { Button, PageHeader } from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { ImBreadcrumbs } from "../../components/ImBreadcrumbs";
import {
  ComplaintActionBar,
} from "../../components/details/ComplaintActionBar";
import { ComplaintMediaSection } from "../../components/details/ComplaintMediaSection";
import { ComplaintSummarySection } from "../../components/details/ComplaintSummarySection";
import { ComplaintTimelineSection } from "../../components/details/ComplaintTimelineSection";
import { IM_ROUTES } from "../../constants/routes";
import { useComplaintDetails } from "../../hooks/use-complaint-details";
import { isAssigneeScopedUser } from "../../utils/access";

function translateOr(
  t: (key: string) => string,
  key: string,
  fallback: string,
): string {
  const value = t(key);
  return value === key ? fallback : value;
}

function useComplaintRouteParams() {
  return useMemo(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const detailsIndex = segments.indexOf("details");
    return {
      incidentId: detailsIndex >= 0 ? (segments[detailsIndex + 1] ?? "") : "",
      tenantId: detailsIndex >= 0 ? (segments[detailsIndex + 2] ?? "") : "",
    };
  }, []);
}

export function ComplaintDetailsPage() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { incidentId, tenantId } = useComplaintRouteParams();
  const basePath = `/${contextPath()}`;
  const homePath = employeeHomePath();
  const inboxPath = `${basePath}${IM_ROUTES.inbox}`;

  const {
    complaintDetails,
    workflowDetails,
    isLoading,
    isError,
    revalidate,
  } = useComplaintDetails(incidentId, tenantId);

  if (!incidentId || !tenantId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-destructive">{t("CS_COMMON_SOMETHING_WENT_WRONG")}</p>
        <Button asChild variant="outline">
          <Link to={inboxPath}>{translateOr(t, "ES_IM_VIEW_INBOX", "View inbox")}</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !complaintDetails || !workflowDetails) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-destructive">
          {translateOr(t, "CS_COMMON_COMPLAINT_NOT_FOUND", "Ticket not found")}
        </p>
        <Button asChild variant="outline">
          <Link to={inboxPath}>{translateOr(t, "ES_IM_VIEW_INBOX", "View inbox")}</Link>
        </Button>
      </div>
    );
  }

  const applyCheckpoint = workflowDetails.timeline.find((checkpoint) =>
    ["APPLY", "CREATE"].includes(checkpoint.performedAction ?? ""),
  );
  const timelineMediaImages =
    applyCheckpoint?.thumbnailsToShow?.fullImage ?? complaintDetails.images;
  const timelineMediaVideos =
    applyCheckpoint?.thumbnailsToShow?.videos ?? complaintDetails.videos;

  const handleActionComplete = async () => {
    await revalidate();
    if (isAssigneeScopedUser(user?.roles)) {
      await navigate({ to: inboxPath });
    }
  };

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <ImBreadcrumbs
        items={[
          { label: translateOr(t, "ES_COMMON_HOME", "Home"), to: homePath },
          { label: translateOr(t, "ES_IM_INBOX", "Inbox"), to: inboxPath },
          { label: incidentId },
        ]}
      />

      <PageHeader
        title={translateOr(t, "CS_HEADER_TICKET_DETAILS", "Ticket Details")}
        description={translateOr(
          t,
          "CS_COMPLAINT_DETAILS_PAGE_DESC",
          "Review ticket information, attachments, and workflow history.",
        )}
      />

      <ComplaintSummarySection complaintDetails={complaintDetails} />

      <ComplaintMediaSection
        images={timelineMediaImages}
        videos={timelineMediaVideos}
      />

      <ComplaintTimelineSection
        timeline={workflowDetails.timeline}
        complaintDetails={complaintDetails}
      />

      <ComplaintActionBar
        complaintDetails={complaintDetails}
        workflowDetails={workflowDetails}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}
