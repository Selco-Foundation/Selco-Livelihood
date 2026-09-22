import { useAuthStore } from "@/shared";
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
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorCount, setErrorCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [validatedFile, setValidatedFile] = useState<DownloadedFile | null>(null);
  const [errorReportFile, setErrorReportFile] = useState<DownloadedFile | null>(null);

  async function downloadTemplate() {
    if (!planId || !accessToken) return;
    setStatus("downloading");
    try {
      const file = await downloadSolutionTemplate(planId, solutionCode, accessToken, user);
      triggerBrowserDownload(file);
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to download the template");
      setStatus("error");
    }
  }

  async function uploadAndValidate(file: File) {
    if (!planId || !accessToken) return;
    setStatus("validating");
    setErrorReportFile(null);
    try {
      const result = await validateSolutionTemplate(file, planId, solutionCode, accessToken, user);
      setErrorCount(result.errorCount);
      if (result.errorCount > 0) {
        setValidatedFile(null);
        setErrorReportFile(result.file);
        setStatus("invalid");
        return;
      }
      // A fresh object reference every time — TemplateStep's effect refires on this identity.
      setValidatedFile(result.file);
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "IC report template validation failed");
      setStatus("error");
    }
  }

  function downloadErrorReport() {
    if (errorReportFile) triggerBrowserDownload(errorReportFile);
  }

  async function createTemplate(): Promise<boolean> {
    if (!planId || !validatedFile || !accessToken) return false;
    setStatus("uploading");
    try {
      const created = await createSolutionTemplate(planId, solutionCode, validatedFile, accessToken, user);
      setStatus(created ? "done" : "error");
      return created;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "IC report template creation failed");
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
    errorMessage,
    validatedFile,
    downloadTemplate,
    uploadAndValidate,
    downloadErrorReport,
    createTemplate,
  };
}
