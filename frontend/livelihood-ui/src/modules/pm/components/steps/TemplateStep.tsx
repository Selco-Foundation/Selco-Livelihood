import { translateOr, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useInstallationSolutions } from "../../hooks/use-installation-solutions";
import { useSolutionTemplateUpload } from "../../hooks/use-solution-template-upload";
import type { InstallationPlanTemplateEntry, InstallationPlanScopeEntry } from "../../types/installation-plan";
import { IngestionStatusBlocks } from "../IngestionStatusBlocks";
import { StepSectionCard } from "../StepSectionCard";

export type TemplateValue = InstallationPlanTemplateEntry[];

export function isTemplateStepValid(value: TemplateValue, uniqueSolutionCodes: string[]): boolean {
  if (uniqueSolutionCodes.length === 0) return false;
  const uploadedBySolution = new Map(value.map((entry) => [entry.solutionCode, entry.uploaded]));
  return uniqueSolutionCodes.every((code) => uploadedBySolution.get(code));
}

interface SolutionTemplateCardProps {
  planId: string | undefined;
  solutionCode: string;
  solutionName: string;
  assignedSiteIds: string[];
  uploaded: boolean;
  locked: boolean;
  onUploaded: () => void;
  onBusyChange: (solutionCode: string, isBusy: boolean) => void;
}

function SolutionTemplateCard({
  planId,
  solutionCode,
  solutionName,
  assignedSiteIds,
  uploaded,
  locked,
  onUploaded,
  onBusyChange,
}: SolutionTemplateCardProps) {
  const { t } = useTranslate();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    status,
    errorCount,
    errorMessage,
    validatedFile,
    downloadTemplate,
    uploadAndValidate,
    downloadErrorReport,
    createTemplate,
    isBusy,
  } = useSolutionTemplateUpload(planId, solutionCode);
  const processedFileRef = useRef<typeof validatedFile>(null);

  useEffect(() => {
    onBusyChange(solutionCode, isBusy);
  }, [isBusy, solutionCode, onBusyChange]);

  // `validatedFile` only lands in this render's props once the hook's own
  // state has actually updated, so reacting to it here (rather than chaining
  // straight off the upload promise) avoids calling `createTemplate` against
  // a stale closure where it hadn't been set yet.
  useEffect(() => {
    if (validatedFile && validatedFile !== processedFileRef.current) {
      processedFileRef.current = validatedFile;
      void createTemplate().then((created) => {
        if (created) onUploaded();
      });
    }
  }, [validatedFile, createTemplate, onUploaded]);

  return (
    <div className="livelihood-card p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
        <div>
          <p className="font-semibold text-primary">{solutionName}</p>
          <span
            className={
              "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
              (uploaded ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
            }
          >
            {uploaded ? <CheckCircle2 className="size-3" /> : null}
            {uploaded
              ? translateOr(t, "ES_PM_TEMPLATE_UPLOADED", "Template uploaded")
              : translateOr(t, "ES_PM_TEMPLATE_NOT_UPLOADED", "Not uploaded yet")}
          </span>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {translateOr(t, "ES_PM_ASSIGNED_USERS", "ASSIGNED SITES").toUpperCase()} ({assignedSiteIds.length})
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-foreground">
            {assignedSiteIds.map((siteId) => (
              <li key={siteId}>{siteId}</li>
            ))}
          </ul>
        </div>
        <div className="flex min-h-[110px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-input bg-card p-4 text-center">
          <Upload className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {translateOr(t, "ES_PM_TEMPLATE_FOR", "Template for")} {solutionName}
            </p>
            <p className="text-xs text-muted-foreground">
              {uploaded
                ? translateOr(t, "ES_PM_TEMPLATE_UPLOADED", "Uploaded")
                : status === "validating"
                  ? translateOr(t, "ES_PM_VALIDATING", "Validating...")
                  : translateOr(t, "ES_PM_DRAG_DROP_HINT", "Drag and drop file here or click below")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} disabled={isBusy}>
              <Download className="size-4" />
              {translateOr(t, "ES_PM_DOWNLOAD_TEMPLATE", "Download Template")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isBusy || locked}
            >
              <Upload className="size-4" />
              {translateOr(t, "ES_PM_UPLOAD_TEMPLATE", "Upload Template")}
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file && !locked) void uploadAndValidate(file);
              event.target.value = "";
            }}
          />
          <IngestionStatusBlocks
            compact
            status={status}
            errorCount={errorCount}
            errorMessage={errorMessage}
            onDownloadErrorReport={downloadErrorReport}
          />
        </div>
      </div>
    </div>
  );
}

interface TemplateStepProps {
  planId: string | undefined;
  planCode?: string;
  scope: InstallationPlanScopeEntry[];
  value: TemplateValue;
  onChange: (value: TemplateValue) => void;
  onBusyChange?: (isBusy: boolean) => void;
  /** Published plans retain uploaded templates but do not allow replacements. */
  locked?: boolean;
}

export function TemplateStep({ planId, planCode, scope, value, onChange, onBusyChange, locked = false }: TemplateStepProps) {
  const { t } = useTranslate();
  const busySolutionsRef = useRef(new Set<string>());
  const { data: solutions = [] } = useInstallationSolutions();

  const solutionsInScope = useMemo(() => {
    const codes = new Set(scope.filter((entry) => entry.included && entry.solutionCode).map((entry) => entry.solutionCode!));
    return Array.from(codes).map((code) => ({
      code,
      name: solutions.find((solution) => solution.code === code)?.name ?? code,
    }));
  }, [scope, solutions]);

  function assignedSiteIds(solutionCode: string) {
    return scope.filter((entry) => entry.included && entry.solutionCode === solutionCode).map((entry) => entry.siteId);
  }

  function markUploaded(solutionCode: string) {
    const withoutSolution = value.filter((entry) => entry.solutionCode !== solutionCode);
    onChange([...withoutSolution, { solutionCode, uploaded: true }]);
  }

  function handleCardBusyChange(solutionCode: string, isBusy: boolean) {
    if (isBusy) busySolutionsRef.current.add(solutionCode);
    else busySolutionsRef.current.delete(solutionCode);
    onBusyChange?.(busySolutionsRef.current.size > 0);
  }

  return (
    <StepSectionCard
      icon={FileSpreadsheet}
      title={translateOr(t, "ES_PM_TEMPLATE", "Template")}
      description={translateOr(
        t,
        "ES_PM_TEMPLATE_DESC",
        "Download, fill in, and upload the IC report template for each solution in this plan",
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
        {solutionsInScope.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {translateOr(t, "ES_PM_NO_SOLUTIONS_IN_SCOPE", "No solutions in scope yet — go back and include a site")}
          </p>
        ) : (
          solutionsInScope.map((solution) => (
            <SolutionTemplateCard
              key={solution.code}
              planId={planId}
              solutionCode={solution.code}
              solutionName={solution.name}
              assignedSiteIds={assignedSiteIds(solution.code)}
              uploaded={value.some((entry) => entry.solutionCode === solution.code && entry.uploaded)}
              locked={locked}
              onUploaded={() => markUploaded(solution.code)}
              onBusyChange={handleCardBusyChange}
            />
          ))
        )}
      </div>
    </StepSectionCard>
  );
}
