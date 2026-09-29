import { translateOr, useTranslate } from "@/shared";
import { cn } from "@/ui";
import { AlertTriangle, Info } from "lucide-react";

interface IngestionStatusBlocksProps {
  /** The owning ingestion hook's current status. */
  status: string;
  errorMessage?: string;
  /** Render as advice rather than a fault: amber, not red. Set when the server answered 4xx —
   *  it is telling the Project Manager what to change, and red reads as "the app is broken". */
  isGuidance?: boolean;
  /** Tighter type and padding, for the per-solution cards in the Template step. */
  compact?: boolean;
}

/**
 * The "something went wrong" block shared by every ingestion surface — the two wizard upload
 * panels and each Template-step solution card. Validation-errors-in-the-file is surfaced by the
 * Preview button next to this instead, since it's the same file either way.
 */
export function IngestionStatusBlocks({
  status,
  errorMessage,
  isGuidance = false,
  compact = false,
}: Readonly<IngestionStatusBlocksProps>) {
  const { t } = useTranslate();
  const box = compact ? "w-full rounded-lg border p-3 text-left" : "rounded-lg border p-4";
  const text = compact ? "text-xs font-medium" : "text-sm font-medium";

  if (status !== "error") {
    return null;
  }

  // Amber rather than red, and Info rather than AlertTriangle: nothing has gone wrong, there is
  // just nothing to download or upload until the Project Manager changes something.
  const Icon = isGuidance ? Info : AlertTriangle;
  const tone = isGuidance
    ? { box: "border-amber-300 bg-amber-50", icon: "text-amber-600", text: "text-amber-800" }
    : { box: "border-destructive/30 bg-destructive/5", icon: "text-destructive", text: "text-destructive" };

  return (
    <div className={cn("flex items-center gap-2", tone.box, box)} role={isGuidance ? "status" : "alert"}>
      <Icon className={cn("size-4 shrink-0", tone.icon)} />
      <p className={cn(text, tone.text)}>
        {errorMessage ?? translateOr(t, "ES_PM_ACTION_FAILED", "Something went wrong. Please try again.")}
      </p>
    </div>
  );
}
