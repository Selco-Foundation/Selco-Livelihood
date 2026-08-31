import { translateOr, useTranslate } from "@/shared";
import { Download, FileText } from "lucide-react";
import type { ReportDocument, ReportSectionContent } from "../../types/facility-review";

function formatFileSize(bytes?: number): string {
  if (!bytes) {
    return "";
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentCard({ document }: { document: ReportDocument }) {
  return (
    <a
      href={document.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex w-72 shrink-0 items-center gap-3 rounded-md border border-border bg-card p-3 hover:bg-muted/40"
    >
      <FileText className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-950">{document.name}</p>
        <p className="text-xs text-ink-600">{formatFileSize(document.size)}</p>
      </div>
      <Download className="size-4 shrink-0 text-primary" />
    </a>
  );
}

interface DocumentSlotProps {
  titleKey: string;
  title: string;
  document: ReportDocument | null;
}

/** A single named document slot — shows "Not Applicable" when absent, matching e4h. */
function DocumentSlot({ titleKey, title, document }: DocumentSlotProps) {
  const { t } = useTranslate();

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4">
      <p className="text-sm font-semibold text-primary">{translateOr(t, titleKey, title)}</p>
      {document ? (
        <DocumentCard document={document} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {translateOr(t, "ES_COMMON_NOT_APPLICABLE", "Not Applicable")}
        </p>
      )}
    </div>
  );
}

interface ReportSectionBodyProps {
  section: ReportSectionContent;
}

export function ReportSectionBody({ section }: ReportSectionBodyProps) {
  const { t } = useTranslate();

  return (
    <div className="space-y-4">
      <DocumentSlot
        titleKey="ES_IR_INSTALLATION_COMPLETION_CERTIFICATE"
        title="Installation Completion Certificate"
        document={section.installationCompletionCertificate}
      />
      <DocumentSlot
        titleKey="ES_IR_ASSET_HANDOVER_DOCUMENT"
        title="Asset Handover Document"
        document={section.assetHandoverDocument}
      />

      {section.supportingDocuments.length > 0 ? (
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-primary">
            {translateOr(t, "ES_IR_SUPPORTING_DOCUMENTS", "Supporting Documents")}
          </p>
          <div className="flex flex-wrap gap-3">
            {section.supportingDocuments.map((document) => (
              <DocumentCard key={document.url} document={document} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
