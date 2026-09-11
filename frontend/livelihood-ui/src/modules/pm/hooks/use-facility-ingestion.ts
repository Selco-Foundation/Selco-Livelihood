import { useState } from "react";
import {
  createFacilitiesAndUpdateProject,
  downloadFacilityIngestionTemplate,
  validateFacilitiesExcel,
} from "../services/ingestion";
import type { GeographyDetails } from "../types/project";
import { triggerBrowserDownload, type DownloadedFile } from "../utils/file-download";

type IngestionStatus = "idle" | "downloading" | "validating" | "invalid" | "creating" | "done" | "error";

/** State machine wrapping the (mock) ingestion service for the end-user data
 *  step: download a template, then validate and apply a clean file directly. */
export function useFacilityIngestion(projectId: string | undefined, geographyDetails: GeographyDetails) {
  const [status, setStatus] = useState<IngestionStatus>("idle");
  const [errorCount, setErrorCount] = useState(0);
  const [errorReportFile, setErrorReportFile] = useState<DownloadedFile | null>(null);

  async function downloadTemplate() {
    if (!projectId) return;
    setStatus("downloading");
    try {
      const file = await downloadFacilityIngestionTemplate(projectId, geographyDetails);
      triggerBrowserDownload(file);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function uploadAndValidate(file: File, simulateErrors = false) {
    setStatus("validating");
    setErrorReportFile(null);
    try {
      const result = await validateFacilitiesExcel(file, simulateErrors);
      setErrorCount(result.errorCount);
      if (result.errorCount > 0) {
        setErrorReportFile(result.file);
        setStatus("invalid");
        return;
      }
      // A clean validation is sufficient to create/update the project's
      // end-user data. The real API call will replace this mock operation.
      setStatus("creating");
      await createFacilitiesAndUpdateProject(result.file);
      setStatus("done");
    } catch {
      setStatus("error");
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
