import { useAuthStore } from "@/shared";
import { useState } from "react";
import {
  createFacilitiesAndUpdateProject,
  downloadFacilityIngestionTemplate,
  validateFacilitiesExcel,
} from "../services/ingestion";
import type { GeographyDetails } from "../types/project";
import { triggerBrowserDownload, type DownloadedFile } from "../utils/file-download";

type IngestionStatus = "idle" | "downloading" | "validating" | "invalid" | "creating" | "done" | "error";

/** State machine wrapping the real ingestion-service round-trip for the end-user data step:
 *  download a template, then validate and apply a clean file directly. */
export function useFacilityIngestion(projectId: string | undefined, geographyDetails: GeographyDetails) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [status, setStatus] = useState<IngestionStatus>("idle");
  const [errorCount, setErrorCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [errorReportFile, setErrorReportFile] = useState<DownloadedFile | null>(null);

  async function downloadTemplate() {
    if (!projectId) return;
    setStatus("downloading");
    try {
      const file = await downloadFacilityIngestionTemplate(projectId, geographyDetails, accessToken ?? undefined, user);
      triggerBrowserDownload(file);
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to download the template");
      setStatus("error");
    }
  }

  async function uploadAndValidate(file: File) {
    if (!projectId || !accessToken) return;
    setStatus("validating");
    setErrorReportFile(null);
    try {
      const result = await validateFacilitiesExcel(file, projectId, accessToken, user);
      setErrorCount(result.errorCount);
      if (result.errorCount > 0) {
        setErrorReportFile(result.file);
        setStatus("invalid");
        return;
      }
      setStatus("creating");
      await createFacilitiesAndUpdateProject(result.file, projectId, accessToken, user);
      setStatus("done");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Facility ingestion failed");
      setStatus("error");
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
