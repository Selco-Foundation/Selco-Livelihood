import { translateOr, useTranslate } from "@/shared";
import { ListChecks } from "lucide-react";
import { useEffect } from "react";
import { useInstallationScopeIngestion } from "../../hooks/use-installation-scope-ingestion";
import type { GeographyDetails } from "../../types/project";
import type { InstallationPlanScopeEntry } from "../../types/installation-plan";
import { FileIngestionPanel } from "../FileIngestionPanel";
import { StepSectionCard } from "../StepSectionCard";

export type ScopeValue = InstallationPlanScopeEntry[];

export function isScopeValid(value: ScopeValue): boolean {
  const included = value.filter((entry) => entry.included);
  return included.length > 0 && included.every((entry) => Boolean(entry.solutionCode));
}

interface InstallationScopeStepProps {
  planId: string | undefined;
  planCode?: string;
  projectId: string | undefined;
  projectGeography: GeographyDetails;
  sectorCodes: string[];
  value: ScopeValue;
  onChange: (value: ScopeValue) => void;
  onBusyChange?: (isBusy: boolean) => void;
  /** Commits successfully applied scope entries to the parent wizard. */
  onScopeApplied?: (value: ScopeValue) => void;
}

export function InstallationScopeStep({
  planId,
  planCode,
  projectId,
  projectGeography,
  sectorCodes,
  onChange,
  onBusyChange,
  onScopeApplied,
}: InstallationScopeStepProps) {
  const { t } = useTranslate();
  const {
    status,
    errorCount,
    errorMessage,
    downloadTemplate,
    uploadAndValidate,
    downloadErrorReport,
    isBusy,
  } = useInstallationScopeIngestion(planId, projectId, sectorCodes, projectGeography);

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
      <FileIngestionPanel
        planCode={planCode}
        status={status}
        errorCount={errorCount}
        errorMessage={errorMessage}
        isBusy={isBusy}
        downloadLabel={translateOr(t, "ES_PM_DOWNLOAD_INSTALLATION_SCOPE", "Download Installation Scope")}
        downloadDisabled={!planId || sectorCodes.length === 0 || !projectGeography.blocks?.length}
        onDownload={downloadTemplate}
        accept=".xlsx"
        uploadHint={translateOr(t, "ES_PM_UPLOAD_HINT", "Click to upload the filled-in scope sheet")}
        doneMessage={translateOr(t, "ES_PM_SCOPE_APPLIED", "Installation scope applied")}
        onFileSelected={(file) =>
          void uploadAndValidate(file).then((entries) => {
            if (entries) {
              onChange(entries);
              onScopeApplied?.(entries);
            }
          })
        }
        onDownloadErrorReport={downloadErrorReport}
      />
    </StepSectionCard>
  );
}
