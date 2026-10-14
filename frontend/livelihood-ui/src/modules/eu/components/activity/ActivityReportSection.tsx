import { translateOr, useTranslate } from "@/shared";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Skeleton } from "@/ui";
import { FileText } from "lucide-react";
import { useState } from "react";
import { useLoadReportSection } from "../../hooks/use-activity-details";
import type { ReportSection, ResolvedReportSection } from "../../types/activity-detail";

interface ActivityReportSectionProps {
  activityId: string;
  facilityName: string;
  reportSection: ReportSection;
}

function DocumentLink({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
    >
      <FileText className="size-4" />
      {label}
    </a>
  );
}

export function ActivityReportSection({ activityId, facilityName, reportSection }: ActivityReportSectionProps) {
  const { t } = useTranslate();
  const loadReportSection = useLoadReportSection(activityId, facilityName);
  const [resolved, setResolved] = useState<ResolvedReportSection>();
  const [isLoading, setIsLoading] = useState(false);

  if (reportSection.documents.length === 0) {
    return null;
  }

  function handleExpand(values: string[]) {
    if (values.length === 0 || resolved) {
      return;
    }
    setIsLoading(true);
    loadReportSection(reportSection.documents)
      .then(setResolved)
      .finally(() => setIsLoading(false));
  }

  return (
    <Accordion type="multiple" onValueChange={handleExpand}>
      <AccordionItem value="report" className="livelihood-card border-none px-5">
        <AccordionTrigger className="text-base font-semibold text-foreground">
          {translateOr(t, "INSTALLATION_COMPLETION_REPORT", "Installation Completion Report")}
        </AccordionTrigger>
        <AccordionContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : resolved ? (
            <div className="space-y-2">
              {resolved.installationCompletionCertificate ? (
                <DocumentLink
                  label={translateOr(t, "COMPLETION_CERTIFICATE", "Completion Certificate")}
                  url={resolved.installationCompletionCertificate.url}
                />
              ) : null}
              {resolved.assetHandoverDocument ? (
                <DocumentLink
                  label={translateOr(t, "ASSET_HANDOVER_DOCUMENT", "Asset Handover Document")}
                  url={resolved.assetHandoverDocument.url}
                />
              ) : null}
              {resolved.supportingDocuments.map((document, index) => (
                <DocumentLink
                  key={document.url}
                  label={`${translateOr(t, "SUPPORTING_DOCUMENT", "Supporting Document")} ${index + 1}`}
                  url={document.url}
                />
              ))}
            </div>
          ) : null}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
