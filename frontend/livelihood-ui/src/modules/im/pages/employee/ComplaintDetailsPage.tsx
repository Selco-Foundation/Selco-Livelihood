import { contextPath, useTranslate } from "@/shared";
import { Button, PageHeader } from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useMemo } from "react";
import {
  ComplaintActionBar,
} from "../../components/details/ComplaintActionBar";
import { ComplaintMediaSection } from "../../components/details/ComplaintMediaSection";
import { ComplaintSummarySection } from "../../components/details/ComplaintSummarySection";
import { ComplaintTimelineSection } from "../../components/details/ComplaintTimelineSection";
import { IM_ROUTES } from "../../constants/routes";
import { useComplaintDetails } from "../../hooks/use-complaint-details";

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
  const { incidentId, tenantId } = useComplaintRouteParams();
  const basePath = `/${contextPath()}`;
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

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 px-0 text-muted-foreground hover:text-primary"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              void navigate({ to: inboxPath });
            }
          }}
        >
          <ArrowLeft className="size-4" />
          {t("CS_COMMON_BACK")}
        </Button>
      </div>

      <nav className="text-sm text-muted-foreground">
        <Link to={inboxPath} className="hover:text-primary">
          {translateOr(t, "ES_IM_TICKETS", "Tickets")}
        </Link>
        <span className="mx-2">&gt;</span>
        <span>{incidentId}</span>
      </nav>

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
        videos={complaintDetails.videos}
      />

      <ComplaintTimelineSection
        timeline={workflowDetails.timeline}
        complaintDetails={complaintDetails}
      />

      <ComplaintActionBar
        complaintDetails={complaintDetails}
        workflowDetails={workflowDetails}
        onActionComplete={revalidate}
      />
    </div>
  );
}
