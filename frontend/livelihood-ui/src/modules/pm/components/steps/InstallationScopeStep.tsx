import { translateOr, useTranslate } from "@/shared";
import { Button, cn } from "@/ui";
import { CheckCircle2, Download, ListChecks, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useInstallationScopeIngestion } from "../../hooks/use-installation-scope-ingestion";
import type { InstallationPlanScopeEntry } from "../../types/installation-plan";
import { StepSectionCard } from "../StepSectionCard";

export type ScopeValue = InstallationPlanScopeEntry[];

export function isScopeValid(value: ScopeValue): boolean {
  const included = value.filter((entry) => entry.included);
  return included.length > 0 && included.every((entry) => Boolean(entry.solutionCode));
}

interface InstallationScopeStepProps {
  planId: string | undefined;
  planCode?: string;
  sectorCode: string;
  value: ScopeValue;
  onChange: (value: ScopeValue) => void;
  onBusyChange?: (isBusy: boolean) => void;
  /** Commits successfully applied scope entries to the parent wizard. */
  onScopeApplied?: (value: ScopeValue) => void;
}

export function InstallationScopeStep({
  planId,
  planCode,
  sectorCode,
  value,
  onChange,
  onBusyChange,
  onScopeApplied,
}: InstallationScopeStepProps) {
  const { t } = useTranslate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [simulateErrors, setSimulateErrors] = useState(false);
  const {
    status,
    errorCount,
    downloadTemplate,
    uploadAndValidate,
    downloadErrorReport,
  } = useInstallationScopeIngestion(planId, sectorCode, value);

  const isBusy = status === "downloading" || status === "validating" || status === "creating";

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  return (
    <StepSectionCard
      icon={ListChecks}
      title={translateOr(t, "ES_PM_INSTALLATION_SCOPE", "Installation Scope")}
      description={translateOr(
        t,
        "ES_PM_INSTALLATION_SCOPE_DESC",
        "Download the installation scope sheet, mark the sites and solutions to include, then upload it back",
      )}
    >
      <div className="space-y-4">
        {planCode ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">
              {translateOr(t, "ES_PM_INSTALLATION_PLAN_CODE", "Installation Plan Code")}:
            </span>
            <span className="font-semibold text-foreground">{planCode}</span>
          </div>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} disabled={isBusy || !planId}>
          <Download className="size-4" />
          {translateOr(t, "ES_PM_DOWNLOAD_INSTALLATION_SCOPE", "Download Installation Scope")}
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
              : translateOr(t, "ES_PM_UPLOAD_HINT", "Click to upload the filled-in scope sheet")}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadAndValidate(file, simulateErrors).then((entries) => {
                if (entries) {
                  onChange(entries);
                  onScopeApplied?.(entries);
                }
              });
            }
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
            {translateOr(t, "ES_PM_SCOPE_APPLIED", "Installation scope applied")}
          </p>
        ) : null}

      </div>
    </StepSectionCard>
  );
}
