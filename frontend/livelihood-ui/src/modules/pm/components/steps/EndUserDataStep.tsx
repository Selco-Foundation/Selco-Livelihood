import { translateOr, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { useFacilityIngestion } from "../../hooks/use-facility-ingestion";
import type { GeographyDetails } from "../../types/project";
import { StepSectionCard } from "../StepSectionCard";

export interface EndUserDataStepHandle {
  submit: () => Promise<void>;
}

interface EndUserDataStepProps {
  projectId: string | undefined;
  geographyDetails: GeographyDetails;
  onComplete: () => Promise<void>;
  /** Fired once validated end-user data has been applied. */
  onValidated?: () => void;
  /** Reports whether an async download/validate/create call is in flight,
   *  so the parent can disable step navigation while one is running. */
  onBusyChange?: (isBusy: boolean) => void;
  /** Lets the wizard footer enable Submit only after end-user data is applied. */
  onSubmitAvailabilityChange?: (isAvailable: boolean) => void;
}

export const EndUserDataStep = forwardRef<EndUserDataStepHandle, EndUserDataStepProps>(function EndUserDataStep({
  projectId,
  geographyDetails,
  onComplete,
  onValidated,
  onBusyChange,
  onSubmitAvailabilityChange,
}, ref) {
  const { t } = useTranslate();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    status,
    errorCount,
    errorMessage,
    downloadTemplate,
    uploadAndValidate,
    downloadErrorReport,
  } = useFacilityIngestion(projectId, geographyDetails);

  const isBusy = status === "downloading" || status === "validating" || status === "creating";
  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  useEffect(() => {
    if (status === "done") onValidated?.();
  }, [onValidated, status]);

  const handleSubmit = useCallback(async () => {
    await onComplete();
  }, [onComplete]);

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit]);

  useEffect(() => {
    onSubmitAvailabilityChange?.(status === "done" && !isBusy);
  }, [isBusy, onSubmitAvailabilityChange, status]);

  return (
    <StepSectionCard
      icon={FileSpreadsheet}
      title={translateOr(t, "ES_PM_END_USER_DATA", "End User Data")}
      description={translateOr(
        t,
        "ES_PM_END_USER_DATA_DESC",
        "Download the facility template, fill it in, and upload it back",
      )}
    >
      <div className="space-y-4">
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} disabled={isBusy}>
          <Download className="size-4" />
          {translateOr(t, "ES_PM_DOWNLOAD_TEMPLATE", "Download Template")}
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
            {status === "validating"
              ? translateOr(t, "ES_PM_VALIDATING", "Validating...")
              : translateOr(t, "ES_PM_UPLOAD_HINT", "Click to upload the filled-in template")}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadAndValidate(file);
            event.target.value = "";
          }}
        />

        {status === "invalid" ? (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              {translateOr(t, "ES_PM_VALIDATION_ERRORS", "Found errors in the uploaded file")}: {errorCount}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={downloadErrorReport}>
              <Download className="size-4" />
              {translateOr(t, "ES_PM_DOWNLOAD_ERROR_REPORT", "Download Error Report")}
            </Button>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <AlertTriangle className="size-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {errorMessage ?? translateOr(t, "ES_PM_ACTION_FAILED", "Something went wrong. Please try again.")}
            </p>
          </div>
        ) : null}

        {status === "done" ? (
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="size-4" />
            {translateOr(t, "ES_PM_FILE_UPLOADED_SUCCESSFULLY", "File uploaded successfully")}
          </p>
        ) : null}

      </div>
    </StepSectionCard>
  );
});
