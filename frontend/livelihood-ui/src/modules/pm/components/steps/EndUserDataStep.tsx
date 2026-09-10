import { translateOr, useTranslate } from "@/shared";
import { Button, cn } from "@/ui";
import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFacilityIngestion } from "../../hooks/use-facility-ingestion";
import { StepSectionCard } from "../StepSectionCard";

interface EndUserDataStepProps {
  projectId: string | undefined;
  onComplete: () => void;
  /** Fired once a template has been uploaded and passed validation (0
   *  errors) — the parent uses this to keep the wizard's overall-progress
   *  indicator full from this point on, independent of which step is being
   *  viewed. */
  onValidated?: () => void;
  /** Reports whether an async download/validate/create call is in flight,
   *  so the parent can disable step navigation while one is running. */
  onBusyChange?: (isBusy: boolean) => void;
}

export function EndUserDataStep({ projectId, onComplete, onValidated, onBusyChange }: EndUserDataStepProps) {
  const { t } = useTranslate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [simulateErrors, setSimulateErrors] = useState(false);
  const {
    status,
    errorCount,
    validatedFile,
    downloadTemplate,
    uploadAndValidate,
    downloadErrorReport,
    createFacilities,
  } = useFacilityIngestion(projectId);

  const isBusy = status === "downloading" || status === "validating" || status === "creating";

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  useEffect(() => {
    if (validatedFile) onValidated?.();
  }, [validatedFile, onValidated]);

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
        <Button type="button" variant="outline" onClick={downloadTemplate} disabled={isBusy}>
          <Download className="size-4" />
          {translateOr(t, "ES_PM_DOWNLOAD_TEMPLATE", "Download Template")}
        </Button>

        {/* Dev-only helper: there's no real validation backend yet, so this
            toggle lets both the success and failure paths be exercised —
            remove once real validation responses drive this. */}
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {translateOr(t, "ES_PM_SIMULATE_VALIDATION_ERRORS", "Simulate validation errors on next upload?")}
          </span>
          <div className="flex overflow-hidden rounded-md border border-input">
            <button
              type="button"
              onClick={() => setSimulateErrors(false)}
              className={cn(
                "px-3 py-1 text-sm font-medium transition-colors",
                !simulateErrors ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
              )}
            >
              {translateOr(t, "CORE_COMMON_NO", "No")}
            </button>
            <button
              type="button"
              onClick={() => setSimulateErrors(true)}
              className={cn(
                "px-3 py-1 text-sm font-medium transition-colors",
                simulateErrors ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
              )}
            >
              {translateOr(t, "CORE_COMMON_YES", "Yes")}
            </button>
          </div>
        </div>

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
            if (file) void uploadAndValidate(file, simulateErrors);
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

        {status === "done" ? (
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="size-4" />
            {translateOr(t, "ES_PM_FACILITIES_CREATED", "Facilities created successfully")}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={async () => {
              await createFacilities();
              onComplete();
            }}
            disabled={isBusy || !validatedFile}
          >
            {translateOr(t, "ES_PM_SUBMIT", "Submit")}
          </Button>
        </div>
      </div>
    </StepSectionCard>
  );
}
