import { translateOr, useTranslate } from "@/shared";
import { cn } from "@/ui";
import { AlertTriangle } from "lucide-react";

interface IngestionStatusBlocksProps {
  /** The owning ingestion hook's current status. */
  status: string;
  errorMessage?: string;
  /** Tighter type and padding, for the per-solution cards in the Template step. */
  compact?: boolean;
}

/**
 * The "something went wrong" block shared by every ingestion surface — the two wizard upload
 * panels and each Template-step solution card. Validation-errors-in-the-file is surfaced by the
 * Preview button next to this instead, since it's the same file either way.
 */
export function IngestionStatusBlocks({ status, errorMessage, compact = false }: IngestionStatusBlocksProps) {
  const { t } = useTranslate();
  const box = compact ? "w-full rounded-lg border p-3 text-left" : "rounded-lg border p-4";
  const text = compact ? "text-xs font-medium" : "text-sm font-medium";

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
