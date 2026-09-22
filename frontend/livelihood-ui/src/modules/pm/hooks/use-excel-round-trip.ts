import { useState } from "react";
import { triggerBrowserDownload, type DownloadedFile } from "../utils/file-download";

export type ExcelRoundTripStatus =
  | "idle"
  | "downloading"
  | "validating"
  | "invalid"
  | "creating"
  | "done"
  | "error";

interface ValidationOutcome {
  file: DownloadedFile;
  errorCount: number;
}

interface UseExcelRoundTripOptions<TResult> {
  /** Returns the generated template, or `null` when the caller isn't ready (missing ids etc.). */
  download: (() => Promise<DownloadedFile>) | null;
  /** Returns the annotated workbook plus its error count. `null` disables uploading. */
  validate: ((file: File) => Promise<ValidationOutcome>) | null;
  /** Applies a clean, validated workbook. */
  create: ((validated: DownloadedFile) => Promise<TResult>) | null;
  /**
   * Runs before `download`. Return a message to abort with that error instead of downloading.
   * The Installation Scope step uses this: its sectors and boundaries arrive from queries that
   * resolve after the page does, and downloading in that window silently produces a template
   * with zero rows.
   */
  precheck?: () => string | undefined;
  /**
   * When true (the default) a clean validation runs `create` immediately. The Template step sets
   * it false: it holds the validated file and creates on an explicit `createFromValidated()` call,
   * so the caller can react to `validatedFile` changing identity.
   */
  autoCreate?: boolean;
  messages: {
    downloadFailed: string;
    uploadFailed: string;
    createFailed?: string;
  };
}

/**
 * The download-template / upload / validate / create state machine behind every Excel round-trip
 * in PM — end-user data, installation scope and per-solution IC report templates.
 *
 * These were three separate hooks with identical state, identical try/catch bodies and identical
 * error handling; a fix to one (surfacing the server's real error instead of axios's generic
 * message) had to be applied three times. The three genuine differences between them — a
 * pre-download guard, whether `create` runs automatically, and what `create` returns — are options
 * rather than reasons to keep three copies.
 */
export function useExcelRoundTrip<TResult = void>({
  download,
  validate,
  create,
  precheck,
  autoCreate = true,
  messages,
}: UseExcelRoundTripOptions<TResult>) {
  const [status, setStatus] = useState<ExcelRoundTripStatus>("idle");
  const [errorCount, setErrorCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [errorReportFile, setErrorReportFile] = useState<DownloadedFile | null>(null);
  const [validatedFile, setValidatedFile] = useState<DownloadedFile | null>(null);

  const isBusy = status === "downloading" || status === "validating" || status === "creating";

  async function downloadTemplate() {
    if (!download) return;

    const precheckError = precheck?.();
    if (precheckError) {
      setErrorMessage(precheckError);
      setStatus("error");
      return;
    }

    setStatus("downloading");
    try {
      triggerBrowserDownload(await download());
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : messages.downloadFailed);
      setStatus("error");
    }
  }

  async function uploadAndValidate(file: File): Promise<TResult | null> {
    if (!validate) return null;

    setStatus("validating");
    setErrorReportFile(null);
    try {
      const result = await validate(file);
      setErrorCount(result.errorCount);

      if (result.errorCount > 0) {
        setValidatedFile(null);
        setErrorReportFile(result.file);
        setStatus("invalid");
        return null;
      }

      if (!autoCreate) {
        // A fresh object reference every time — callers key an effect on this identity.
        setValidatedFile(result.file);
        setStatus("idle");
        return null;
      }

      if (!create) {
        setStatus("done");
        return null;
      }

      setStatus("creating");
      const created = await create(result.file);
      setStatus("done");
      return created;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : messages.uploadFailed);
      setStatus("error");
      return null;
    }
  }

  /** For `autoCreate: false` callers — applies the file held by the last clean validation. */
  async function createFromValidated(): Promise<TResult | null> {
    if (!create || !validatedFile) return null;

    setStatus("creating");
    try {
      const created = await create(validatedFile);
      setStatus("done");
      return created;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : messages.createFailed ?? messages.uploadFailed);
      setStatus("error");
      return null;
    }
  }

  function downloadErrorReport() {
    if (errorReportFile) triggerBrowserDownload(errorReportFile);
  }

  return {
    status,
    isBusy,
    errorCount,
    errorMessage,
    validatedFile,
    downloadTemplate,
    uploadAndValidate,
    createFromValidated,
    downloadErrorReport,
  };
}
