import { employeeHomePath, extractApiErrorMessage, translateOr, useAuthStore, useTranslate } from "@/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  cn,
  LabeledValueRows,
  SectionImageGrid,
  toast,
  TopBar,
} from "@/ui";
import { useParams } from "@tanstack/react-router";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { useState } from "react";
import { AmcReviewActionBar } from "../../components/AmcReviewActionBar";
import { AmcReviewHistory } from "../../components/AmcReviewHistory";
import { AmcSlaBadge } from "../../components/AmcSlaBadge";
import { AmcStatusBadge } from "../../components/AmcStatusBadge";
import { ConfirmApproveDialog } from "../../components/ConfirmApproveDialog";
import { ReworkReasonDialog } from "../../components/ReworkReasonDialog";
import { useAmcReport } from "../../hooks/use-amc-report";
import { useApproveAmcReport, useSendAmcReportForRework } from "../../hooks/use-amc-review-actions";
import type { AmcReport } from "../../types/amc-report";
import { hasAmcReviewerAccess } from "../../utils/access";
import { formatAmcDate } from "../../utils/date";
import { amcReportsPath } from "../../utils/paths";

// Card padding and type scale follow the IR review page (ActivityInfoCard, AuditTrailTimeline,
// ReviewSectionsAccordion), so the two review screens look the same.
const CARD = "livelihood-card px-6 py-5 lg:px-7";
const CARD_TITLE = "text-sm font-semibold text-ink-950";

function InfoItem({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <p className="text-sm leading-[21px] text-ink-600">{label}</p>
      <div className="text-base leading-6 font-semibold text-ink-950">{children}</div>
    </div>
  );
}

function ReportSummary({ report }: Readonly<{ report: AmcReport }>) {
  const { t } = useTranslate();
  return (
    <div className={cn(CARD, "grid gap-6 sm:grid-cols-2 lg:grid-cols-4")}>
      <InfoItem label={translateOr(t, "ES_AMC_END_USER", "End user")}>{report.endUserName}</InfoItem>
      <InfoItem label={translateOr(t, "ES_AMC_PHONE_NUMBER", "Phone number")}>{report.endUserPhone}</InfoItem>
      <InfoItem label={translateOr(t, "ES_AMC_LOCATION", "State / District / Block")}>
        {report.state} / {report.district} / {report.block}
      </InfoItem>
      <InfoItem label={translateOr(t, "ES_AMC_VENDOR", "Vendor")}>{report.vendorName}</InfoItem>
      <InfoItem label={translateOr(t, "ES_AMC_NUMBER", "AMC No.")}>
        {report.amcNumber} / {report.totalAmcs}
      </InfoItem>
      <InfoItem label={translateOr(t, "ES_AMC_SCHEDULED_DATE", "Scheduled AMC date")}>
        {formatAmcDate(report.scheduledDate)}
      </InfoItem>
      <InfoItem label={translateOr(t, "ES_AMC_FIRST_SUBMISSION", "First submission")}>
        {formatAmcDate(report.firstSubmissionDate)}
      </InfoItem>
      <InfoItem label={translateOr(t, "ES_AMC_LATEST_SUBMISSION", "Latest submission")}>
        {formatAmcDate(report.latestSubmissionDate)}
      </InfoItem>
      <InfoItem label={translateOr(t, "ES_AMC_REPORT_STATUS", "Report Status")}>
        <AmcStatusBadge status={report.status} approvedBy={report.approvedBy} />
      </InfoItem>
      <InfoItem label={translateOr(t, "ES_AMC_SLA_DAYS_REMAINING", "SLA days remaining")}>
        <AmcSlaBadge latestSubmissionDate={report.latestSubmissionDate} status={report.status} />
      </InfoItem>
      <InfoItem label={translateOr(t, "ES_AMC_PLAN_CODE", "Installation plan")}>{report.planCode}</InfoItem>
      <InfoItem label={translateOr(t, "ES_AMC_PROJECT", "Project")}>{report.projectName}</InfoItem>
    </div>
  );
}

function SystemStatus({ report }: Readonly<{ report: AmcReport }>) {
  const { t } = useTranslate();
  const yesNo = (value: boolean) =>
    value ? translateOr(t, "CORE_COMMON_YES", "Yes") : translateOr(t, "CORE_COMMON_NO", "No");
  return (
    <div className={cn(CARD, "space-y-4")}>
      <h2 className={CARD_TITLE}>{translateOr(t, "ES_AMC_SYSTEM_STATUS", "System status")}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem label={translateOr(t, "ES_AMC_SYSTEM_IN_USE", "Is the end user using the system?")}>
          {yesNo(report.systemInUse)}
        </InfoItem>
        <InfoItem label={translateOr(t, "ES_AMC_SYSTEM_FUNCTIONAL", "Is the system functional?")}>
          <span className={report.systemFunctional ? undefined : "text-destructive"}>
            {yesNo(report.systemFunctional)}
          </span>
        </InfoItem>
      </div>
    </div>
  );
}

function FailedParameters({ report }: Readonly<{ report: AmcReport }>) {
  const { t } = useTranslate();
  const failed = report.ruleResults.filter((result) => !result.passed);
  if (failed.length === 0) return null;
  return (
    <div className={cn(CARD, "border border-destructive/40")}>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertTriangle className="size-4" />
        {translateOr(t, "ES_AMC_NOT_AUTO_APPROVED", "Why this report was not auto-approved")}
      </h2>
      <p className="mb-4 text-sm text-ink-600">
        {translateOr(t, "ES_AMC_NOT_AUTO_APPROVED_DESC", "These readings are outside the accepted range.")}
      </p>
      <ul className="space-y-2">
        {failed.map((result) => (
          <li key={result.code} className="rounded-md bg-destructive/5 px-3 py-2 text-sm">
            <span className="font-semibold text-ink-950">{translateOr(t, result.labelKey, result.label)}:</span>{" "}
            <span className="font-semibold text-destructive">{result.reading}</span>
            <span className="text-muted-foreground">
              {" · "}
              {translateOr(t, "ES_AMC_ACCEPTED_RANGE", "Accepted range")}:{" "}
              {translateOr(t, result.acceptedRangeKey, result.acceptedRange)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One collapsible card per section, same markup as IR's ReviewSectionsAccordion. Open by default:
 *  an AMC report has no lazily loaded media, and the reviewer reads every section. */
function SectionCard({ value, title, children }: Readonly<{ value: string; title: string; children: React.ReactNode }>) {
  return (
    <Accordion type="multiple" defaultValue={[value]} className="livelihood-card px-4 lg:px-5">
      <AccordionItem value={value}>
        <AccordionPrimitive.Header className="flex items-center justify-between gap-3 py-4">
          <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-ink-950 outline-none [&[data-state=open]>svg]:rotate-180">
            {title}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform" />
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
        <AccordionContent className="pb-4">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function FormSections({ report }: Readonly<{ report: AmcReport }>) {
  const { t } = useTranslate();
  return (
    <div className="space-y-4">
      {report.sections.map((section) => (
        <SectionCard key={section.code} value={section.code} title={translateOr(t, section.titleKey, section.title)}>
          <div className="rounded-md border border-border bg-muted/40 p-4">
            <LabeledValueRows items={section.fields} labelWidthClassName="w-72" />
          </div>
        </SectionCard>
      ))}
      <SectionCard value="photo" title={translateOr(t, "ES_AMC_PHOTO_SECTION", "Photo")}>
        <SectionImageGrid
          titleKey="ES_AMC_VERIFICATION_PHOTO"
          title="Field staff with end user at the system"
          images={[{ url: report.photoUrl }]}
        />
      </SectionCard>
    </div>
  );
}

export function AmcReportDetailPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { reportId } = useParams({ strict: false }) as { reportId: string };
  const { data: report, isLoading } = useAmcReport(reportId);
  const approve = useApproveAmcReport();
  const sendForRework = useSendAmcReportForRework();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reworkOpen, setReworkOpen] = useState(false);

  if (!hasAmcReviewerAccess(user?.roles)) return null;

  const isSubmitting = approve.isPending || sendForRework.isPending;
  // Auto-approved and already-reviewed reports are view-only (PRD 5.5.6).
  const canReview = report?.status === "PENDING_APPROVAL";

  function errorDescription(error: unknown) {
    return extractApiErrorMessage(error) ?? translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again.");
  }

  function handleApprove() {
    approve.mutate(reportId, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.success(translateOr(t, "ES_AMC_APPROVED_SUCCESS", "AMC report approved"));
      },
      onError: (error) =>
        toast.error(translateOr(t, "ES_AMC_APPROVE_FAILED", "Could not approve the AMC report"), {
          description: errorDescription(error),
        }),
    });
  }

  function handleRework(reason: string) {
    sendForRework.mutate(
      { reportId, reason },
      {
        onSuccess: () => {
          setReworkOpen(false);
          toast.success(translateOr(t, "ES_AMC_REWORK_SUCCESS", "AMC report sent for rework"));
        },
        onError: (error) =>
          toast.error(translateOr(t, "ES_AMC_REWORK_FAILED", "Could not send the AMC report for rework"), {
            description: errorDescription(error),
          }),
      },
    );
  }

  return (
    // Bounded flex column with an inner scroll region, so the action bar stays inside SidebarInset's box.
    // The negative margins cancel SidebarInset's padding (added back inside the scroll region), so the
    // content scrolls right up to the top edge, the scrollbar sits at the right edge like other pages,
    // and the action bar is a full-width footer flush with the bottom, like the PM wizard's
    // WizardActionFooter but in flow. `data-inner-scroll` makes AppShell drop its reserved gutter here.
    <div
      data-inner-scroll
      className="-mx-4 -my-4 flex h-[calc(100%+2rem)] min-h-0 flex-col lg:-mx-8 lg:-mt-12 lg:-mb-10 lg:h-[calc(100%+5.5rem)]"
    >
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pt-4 pb-6 [scrollbar-gutter:stable] lg:px-8 lg:pt-12 lg:pb-8">
        <TopBar
          title={report?.endUserName ?? ""}
          breadcrumbs={[
            { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
            { label: translateOr(t, "ES_AMC_REPORTS", "AMC Reports"), to: amcReportsPath() },
            { label: report?.endUserName ?? "" },
          ]}
        />

        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            {translateOr(t, "CORE_COMMON_LOADING", "Loading...")}
          </div>
        ) : !report ? (
          <p className="text-sm text-muted-foreground">
            {translateOr(t, "ES_AMC_REPORT_NOT_FOUND", "This AMC report could not be found.")}
          </p>
        ) : (
          <>
            <ReportSummary report={report} />
            <SystemStatus report={report} />
            <FailedParameters report={report} />
            <FormSections report={report} />
            <AmcReviewHistory history={report.history} />
          </>
        )}
      </div>

      {canReview ? (
        // Same scrollbar gutter as the scroll region above, so the buttons line up with the cards.
        <div className="shrink-0 overflow-hidden border-t border-border bg-page/95 px-4 py-3 [scrollbar-gutter:stable] lg:px-8">
          <AmcReviewActionBar
            isSubmitting={isSubmitting}
            onApprove={() => setConfirmOpen(true)}
            onSendForRework={() => setReworkOpen(true)}
          />
        </div>
      ) : null}

      <ConfirmApproveDialog
        open={confirmOpen}
        isSubmitting={isSubmitting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleApprove}
      />
      <ReworkReasonDialog
        open={reworkOpen}
        isSubmitting={isSubmitting}
        onOpenChange={setReworkOpen}
        onSubmit={handleRework}
      />
    </div>
  );
}
