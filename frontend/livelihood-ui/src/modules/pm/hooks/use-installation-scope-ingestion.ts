import { useAuthStore } from "@/shared";
import { useState } from "react";
import { createScopeFromSheet, downloadScopeTemplate, validateScopeSheet } from "../services/installation-scope";
import type { GeographyDetails } from "../types/project";
import type { InstallationPlanScopeEntry } from "../types/installation-plan";
import { triggerBrowserDownload, type DownloadedFile } from "../utils/file-download";

type ScopeIngestionStatus = "idle" | "downloading" | "validating" | "invalid" | "creating" | "done" | "error";

/** State machine wrapping the real Installation Scope Excel round-trip: download a template, then
 *  validate and apply a clean scope immediately. */
export function useInstallationScopeIngestion(
  planId: string | undefined,
  projectId: string | undefined,
  sectorCodes: string[],
  projectGeography: GeographyDetails,
) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [status, setStatus] = useState<ScopeIngestionStatus>("idle");
  const [errorCount, setErrorCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [errorReportFile, setErrorReportFile] = useState<DownloadedFile | null>(null);

  async function downloadTemplate() {
    if (!planId || !projectId || !accessToken) return;
    // Both come from queries that resolve after the wizard's own data (plan/project) loads, and
    // the Download button isn't gated on that finishing — hitting it in that window would silently
    // hand back a template with zero facility rows, since nothing would match an empty sector set
    // or an empty boundary list. Fail loudly instead of downloading a blank spreadsheet.
    if (sectorCodes.length === 0 || !projectGeography.blocks?.length) {
      setErrorMessage("Plan details are still loading. Please wait a moment and try again.");
      setStatus("error");
      return;
    }
    setStatus("downloading");
    try {
      const file = await downloadScopeTemplate(planId, projectId, sectorCodes, projectGeography, accessToken, user);
      triggerBrowserDownload(file);
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to download the scope template");
      setStatus("error");
    }
  }

  async function uploadAndValidate(file: File): Promise<InstallationPlanScopeEntry[] | null> {
    if (!planId || !accessToken) return null;
    setStatus("validating");
    setErrorReportFile(null);
    try {
      const result = await validateScopeSheet(file, planId, accessToken, user);
      setErrorCount(result.errorCount);
      if (result.errorCount > 0) {
        setErrorReportFile(result.file);
        setStatus("invalid");
        return null;
      }
      setStatus("creating");
      const { entries } = await createScopeFromSheet(result.file, planId, accessToken, user);
      setStatus("done");
      return entries;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Installation scope ingestion failed");
      setStatus("error");
      return null;
    }
  }

  function downloadErrorReport() {
    if (errorReportFile) triggerBrowserDownload(errorReportFile);
  }

  return {
    status,
    errorCount,
    errorMessage,
    downloadTemplate,
    uploadAndValidate,
    downloadErrorReport,
  };
}
