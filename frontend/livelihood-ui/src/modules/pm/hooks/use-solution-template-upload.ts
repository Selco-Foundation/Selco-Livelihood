import { useState } from "react";
import {
  createSolutionTemplate,
  downloadSolutionTemplate,
  validateSolutionTemplate,
} from "../services/installation-template";
import { triggerBrowserDownload, type DownloadedFile } from "../utils/file-download";

type UploadStatus = "idle" | "downloading" | "validating" | "invalid" | "uploading" | "done" | "error";

/** Per-solution download/validate/create state machine for the Template
 *  step — mirrors `use-facility-ingestion.ts`'s shape, but keyed by solution
 *  code instead of a single project-wide file. */
export function useSolutionTemplateUpload(planId: string | undefined, solutionCode: string) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorCount, setErrorCount] = useState(0);
  const [validatedFile, setValidatedFile] = useState<DownloadedFile | null>(null);
  const [errorReportFile, setErrorReportFile] = useState<DownloadedFile | null>(null);

  async function downloadTemplate() {
    if (!planId) return;
    setStatus("downloading");
    try {
      const file = await downloadSolutionTemplate(planId, solutionCode);
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
      const result = await validateSolutionTemplate(file, solutionCode, simulateErrors);
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

  async function createTemplate(): Promise<boolean> {
    if (!planId || !validatedFile) return false;
    setStatus("uploading");
    try {
      await createSolutionTemplate(planId, solutionCode, validatedFile);
      setStatus("done");
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  }

  // `createTemplate` reads `validatedFile` from this render's closure —
  // callers must invoke it from an effect keyed on this hook's `validatedFile`
  // return value (not chained straight off `uploadAndValidate`'s promise),
  // or they'll capture a stale closure where `validatedFile` is still null.
  return {
    status,
    errorCount,
    validatedFile,
    downloadTemplate,
    uploadAndValidate,
    downloadErrorReport,
    createTemplate,
  };
}
