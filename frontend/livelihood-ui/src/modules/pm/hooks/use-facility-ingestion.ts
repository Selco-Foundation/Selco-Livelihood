import { useState } from "react";
import { useAuthStore } from "@/shared";
import {
  createFacilitiesAndUpdateProject,
  downloadFacilityIngestionTemplate,
  IngestionApiError,
  validateFacilitiesExcel,
  type BoundaryTreeNode,
  type DownloadedFile,
} from "../services/ingestion";

export type IngestionStage =
  | "idle"
  | "downloading"
  | "validating"
  | "invalid"
  | "creating"
  | "done"
  | "error";

interface IngestionState {
  stage: IngestionStage;
  errorCount: number;
  annotatedFile: DownloadedFile | null;
  errorMessage: string | null;
}

const INITIAL_STATE: IngestionState = {
  stage: "idle",
  errorCount: 0,
  annotatedFile: null,
  errorMessage: null,
};

function triggerBrowserDownload(file: DownloadedFile) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useFacilityIngestion(projectId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [state, setState] = useState<IngestionState>(INITIAL_STATE);

  async function downloadTemplate(boundaryData: BoundaryTreeNode) {
    if (!projectId || !accessToken) return;
    setState((prev) => ({ ...prev, stage: "downloading", errorMessage: null }));
    try {
      const file = await downloadFacilityIngestionTemplate(
        projectId,
        boundaryData,
        accessToken,
        user,
      );
      triggerBrowserDownload(file);
      setState((prev) => ({ ...prev, stage: "idle" }));
    } catch {
      setState((prev) => ({
        ...prev,
        stage: "error",
        errorMessage: "Could not download the template. Please try again.",
      }));
    }
  }

  async function uploadAndValidate(file: File) {
    if (!projectId || !accessToken) return;
    setState((prev) => ({ ...prev, stage: "validating", errorMessage: null }));
    try {
      const result = await validateFacilitiesExcel(
        projectId,
        file,
        file.name,
        accessToken,
        user,
      );

      if (result.errorCount > 0) {
        setState({
          stage: "invalid",
          errorCount: result.errorCount,
          annotatedFile: result.file,
          errorMessage: null,
        });
        return;
      }

      // No validation errors — immediately hand the *validated* blob (not the
      // user's original file) to the create endpoint, per the ingestion-service
      // contract: create rejects any row not already marked PASSED.
      setState((prev) => ({ ...prev, stage: "creating" }));
      await createFacilitiesAndUpdateProject(
        projectId,
        result.file.blob,
        result.file.filename,
        accessToken,
        user,
      );
      setState({ stage: "done", errorCount: 0, annotatedFile: null, errorMessage: null });
    } catch (error) {
      const message =
        error instanceof IngestionApiError ? error.message : "Upload failed. Please try again.";
      setState({ stage: "error", errorCount: 0, annotatedFile: null, errorMessage: message });
    }
  }

  function downloadAnnotatedFile() {
    if (state.annotatedFile) triggerBrowserDownload(state.annotatedFile);
  }

  function reset() {
    setState(INITIAL_STATE);
  }

  return { ...state, downloadTemplate, uploadAndValidate, downloadAnnotatedFile, reset };
}
