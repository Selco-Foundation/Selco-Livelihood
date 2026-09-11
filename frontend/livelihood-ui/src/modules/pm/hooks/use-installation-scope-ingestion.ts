import { useState } from "react";
import {
  createScopeFromSheet,
  downloadScopeTemplate,
  validateScopeSheet,
} from "../services/installation-scope";
import type { InstallationPlanScopeEntry } from "../types/installation-plan";
import { triggerBrowserDownload, type DownloadedFile } from "../utils/file-download";

type ScopeIngestionStatus = "idle" | "downloading" | "validating" | "invalid" | "creating" | "done" | "error";

/** State machine wrapping the (mock) Installation Scope Excel round-trip:
 *  download a template, then validate and apply a clean scope immediately. */
export function useInstallationScopeIngestion(
  planId: string | undefined,
  sectorCode: string,
  existingScope: InstallationPlanScopeEntry[],
) {
  const [status, setStatus] = useState<ScopeIngestionStatus>("idle");
  const [errorCount, setErrorCount] = useState(0);
  const [errorReportFile, setErrorReportFile] = useState<DownloadedFile | null>(null);

  async function downloadTemplate() {
    if (!planId) return;
    setStatus("downloading");
    try {
      const file = await downloadScopeTemplate(planId, sectorCode, existingScope);
      triggerBrowserDownload(file);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function uploadAndValidate(file: File, simulateErrors = false): Promise<InstallationPlanScopeEntry[] | null> {
    setStatus("validating");
    setErrorReportFile(null);
    try {
      const result = await validateScopeSheet(file, sectorCode, simulateErrors);
      setErrorCount(result.errorCount);
      if (result.errorCount > 0) {
        setErrorReportFile(result.file);
        setStatus("invalid");
        return null;
      }
      // A clean validation is the approval to apply the scope. The real
      // implementation will call the update endpoint here; the static flow
      // uses the mock create function with the same transition.
      setStatus("creating");
      const { entries } = await createScopeFromSheet(result.rows);
      setStatus("done");
      return entries;
    } catch {
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
    downloadTemplate,
    uploadAndValidate,
    downloadErrorReport,
  };
}
