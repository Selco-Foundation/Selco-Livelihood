import { useState } from "react";
import {
  createFacilitiesAndUpdateProject,
  downloadFacilityIngestionTemplate,
  validateFacilitiesExcel,
  type DownloadedFile,
} from "../services/ingestion";

type IngestionStatus = "idle" | "downloading" | "validating" | "invalid" | "creating" | "done" | "error";

function triggerBrowserDownload(file: DownloadedFile) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** State machine wrapping the (mock) ingestion service for the end-user data
 *  step: download a template, upload+validate it, then create facilities
 *  from the validated file. */
export function useFacilityIngestion(projectId: string | undefined) {
  const [status, setStatus] = useState<IngestionStatus>("idle");
  const [errorCount, setErrorCount] = useState(0);
  const [validatedFile, setValidatedFile] = useState<DownloadedFile | null>(null);
  const [errorReportFile, setErrorReportFile] = useState<DownloadedFile | null>(null);

  async function downloadTemplate() {
    if (!projectId) return;
    setStatus("downloading");
    try {
      const file = await downloadFacilityIngestionTemplate(projectId);
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
        setValidatedFile(null);
        setErrorReportFile(result.file);
        setStatus("invalid");
        return;
      }
      setValidatedFile(result.file);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function downloadErrorReport() {
    if (errorReportFile) triggerBrowserDownload(errorReportFile);
  }

  async function createFacilities() {
    if (!validatedFile) return;
    setStatus("creating");
    try {
      await createFacilitiesAndUpdateProject(validatedFile);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return {
    status,
    errorCount,
    validatedFile,
    downloadTemplate,
    uploadAndValidate,
    downloadErrorReport,
    createFacilities,
  };
}
