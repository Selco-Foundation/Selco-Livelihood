import { translateOr, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { CheckCircle2, Download, Info, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { DownloadedFile } from "../utils/file-download";
import { hasAcceptedExtension } from "../utils/file-validation";
import { IngestionStatusBlocks } from "./IngestionStatusBlocks";

interface FileIngestionPanelProps {
  /** Shown above the download button when the wizard has a code to display. */
  planCode?: string;
  status: string;
  errorCount: number;
  errorMessage?: string;
  downloadLabel: string;
  downloadDisabled?: boolean;
  onDownload: () => void;
  /** `accept` for the hidden file input, e.g. `".xlsx"`. */
  accept: string;
  uploadHint: string;
  doneMessage: string;
  onFileSelected: (file: File) => void;
  /** The most recent server response file (validate, then create once it returns one), if any. */
  previewFile: DownloadedFile | null;
  previewHasErrors: boolean;
  onPreview: () => void;
  isBusy: boolean;
}

/**
 * Download-a-template / upload-it-back panel, shared by the End User Data and Installation Scope
 * steps. The two differ only in their labels, accepted extensions, download-disabled rule and what
 * they do with the chosen file, so all of those are props.
 */
export function FileIngestionPanel({
  planCode,
  status,
  errorCount,
  errorMessage,
  downloadLabel,
  downloadDisabled = false,
  onDownload,
  accept,
  uploadHint,
  doneMessage,
  onFileSelected,
  previewFile,
  previewHasErrors,
  onPreview,
  isBusy,
}: FileIngestionPanelProps) {
  const { t } = useTranslate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [invalidFileMessage, setInvalidFileMessage] = useState<string | undefined>(undefined);

  return (
    <div className="space-y-4">
      {planCode ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-muted-foreground">
            {translateOr(t, "ES_PM_INSTALLATION_PLAN_CODE", "Installation Plan Code")}:
          </span>
          <span className="font-semibold text-foreground">{planCode}</span>
        </div>
      ) : null}

      <Button type="button" variant="outline" size="sm" onClick={onDownload} disabled={isBusy || downloadDisabled}>
        <Download className="size-4" />
        {downloadLabel}
      </Button>

      <button
        type="button"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-card px-4 py-6 text-center transition-colors hover:border-primary hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="flex size-11 items-center justify-center rounded-full bg-accent text-primary">
          <Upload className="size-5" />
        </div>
        <span className="text-sm text-muted-foreground">
          {status === "validating" ? translateOr(t, "ES_PM_VALIDATING", "Validating...") : uploadHint}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            if (hasAcceptedExtension(file, accept)) {
              setInvalidFileMessage(undefined);
              onFileSelected(file);
            } else {
              setInvalidFileMessage(
                translateOr(
                  t,
                  "ES_PM_INVALID_FILE_TYPE",
                  `Please upload a valid ${accept} file`,
                ),
              );
            }
          }
          // Cleared so re-picking the same filename still fires a change event.
          event.target.value = "";
        }}
      />

      {previewFile ? (
        <div className="space-y-1">
          {previewHasErrors ? (
            <p className="text-sm font-medium text-destructive">
              {translateOr(t, "ES_PM_VALIDATION_ERRORS", "Found errors in the uploaded file")}: {errorCount}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={previewHasErrors ? "destructive" : "outline"}
              size="sm"
              onClick={onPreview}
            >
              <Download className="size-4" />
              {previewHasErrors
                ? translateOr(t, "ES_PM_PREVIEW_FILE_WITH_ERRORS", "Preview File (view errors)")
                : translateOr(t, "ES_PM_PREVIEW_FILE", "Preview File")}
            </Button>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="size-3.5 shrink-0" />
              {translateOr(
                t,
                "ES_PM_PREVIEW_FILE_LOST_ON_NAVIGATE",
                "This preview won't be available once you leave this page",
              )}
            </span>
          </div>
        </div>
      ) : null}

      <IngestionStatusBlocks status={invalidFileMessage ? "error" : status} errorMessage={invalidFileMessage ?? errorMessage} />

      {status === "done" ? (
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <CheckCircle2 className="size-4" />
          {doneMessage}
        </p>
      ) : null}
    </div>
  );
}
