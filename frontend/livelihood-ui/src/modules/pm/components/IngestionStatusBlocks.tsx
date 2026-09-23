import { translateOr, useTranslate } from "@/shared";
import { Button, cn } from "@/ui";
import { AlertTriangle, Download } from "lucide-react";

interface IngestionStatusBlocksProps {
  /** The owning ingestion hook's current status. */
  status: string;
  errorCount: number;
  errorMessage?: string;
  onDownloadErrorReport: () => void;
  /** Tighter type and padding, for the per-solution cards in the Template step. */
  compact?: boolean;
}

/**
 * The "validation found N errors" and "something went wrong" blocks shared by every ingestion
 * surface — the two wizard upload panels and each Template-step solution card.
 */
export function IngestionStatusBlocks({
  status,
  errorCount,
  errorMessage,
  onDownloadErrorReport,
  compact = false,
}: IngestionStatusBlocksProps) {
  const { t } = useTranslate();
  const box = compact ? "w-full rounded-lg border p-3 text-left" : "rounded-lg border p-4";
  const text = compact ? "text-xs font-medium" : "text-sm font-medium";

  if (status === "invalid") {
    return (
      <div className={cn("space-y-2 border-destructive/30 bg-destructive/5", box)}>
        <p className={cn(text, "text-destructive")}>
          {translateOr(t, "ES_PM_VALIDATION_ERRORS", "Found errors in the uploaded file")}: {errorCount}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onDownloadErrorReport}>
          <Download className="size-4" />
          {translateOr(t, "ES_PM_DOWNLOAD_ERROR_REPORT", "Download Error Report")}
        </Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={cn("flex items-center gap-2 border-destructive/30 bg-destructive/5", box)}>
        <AlertTriangle className="size-4 shrink-0 text-destructive" />
        <p className={cn(text, "text-destructive")}>
          {errorMessage ?? translateOr(t, "ES_PM_ACTION_FAILED", "Something went wrong. Please try again.")}
        </p>
      </div>
    );
  }

  return null;
}
