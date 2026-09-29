import { translateOr, useAuthStore, useTranslate } from "@/shared";
import { createScopeFromSheet, downloadScopeTemplate, validateScopeSheet } from "../services/installation-scope";
import type { InstallationPlanScopeEntry } from "../types/installation-plan";
import type { GeographyDetails } from "../types/project";
import { useExcelRoundTrip } from "./use-excel-round-trip";

/** Installation Scope step: download the scope sheet, then validate and apply a clean one. */
export function useInstallationScopeIngestion(
  planId: string | undefined,
  projectId: string | undefined,
  sectorCodes: string[],
  projectGeography: GeographyDetails,
) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const canDownload = Boolean(planId && projectId && accessToken);
  const canUpload = Boolean(planId && accessToken);
  const { t } = useTranslate();

  return useExcelRoundTrip<InstallationPlanScopeEntry[]>({
    // Sectors and geography arrive from queries that resolve after the wizard's own plan/project
    // data, and the Download button isn't gated on that finishing. Downloading in that window
    // hands back a template with zero facility rows, since nothing matches an empty sector set or
    // an empty boundary list. Fail loudly rather than produce a blank spreadsheet.
    precheck: () =>
      sectorCodes.length === 0 || !projectGeography.blocks?.length
        ? translateOr(t, "ES_PM_PLAN_DETAILS_LOADING", "Plan details are still loading. Please wait a moment and try again.")
        : undefined,
    download: canDownload
      ? () => downloadScopeTemplate(planId!, projectId!, sectorCodes, projectGeography, accessToken!, user)
      : null,
    validate: canUpload ? (file) => validateScopeSheet(file, planId!, accessToken!, user) : null,
    create: canUpload
      ? async (validated) => {
          const { entries, file } = await createScopeFromSheet(validated, planId!, accessToken!, user);
          return { result: entries, file };
        }
      : null,
    messages: {
      downloadFailed: translateOr(t, "ES_PM_DOWNLOAD_SCOPE_TEMPLATE_FAILED", "Failed to download the scope template"),
      uploadFailed: translateOr(t, "ES_PM_SCOPE_INGESTION_FAILED", "Installation scope ingestion failed"),
    },
  });
}
