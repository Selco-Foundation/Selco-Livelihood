import { employeeHomePath, extractApiErrorMessage, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Button, Card, CardContent, TopBar, toast } from "@/ui";
import { Download } from "lucide-react";
import { useState } from "react";
import { FileUploadZone } from "../../components/upload/FileUploadZone";
import { downloadBlob } from "../../services/ingestion";
import { useDownloadBoundaryTemplate } from "../../hooks/use-download-boundary-template";
import { useUploadBoundary } from "../../hooks/use-upload-boundary";
import { hasEuAccess } from "../../utils/access";
import { euBoundariesPath } from "../../utils/paths";

export function UploadBoundaryPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);

  const [selectedFileName, setSelectedFileName] = useState<string>();
  const [result, setResult] = useState<
    | { status: "success" }
    | { status: "error"; errorCount: number; hasErrorFile: boolean; downloadResult: () => void }
    | null
  >(null);

  const downloadTemplate = useDownloadBoundaryTemplate();
  const uploadBoundary = useUploadBoundary();

  if (!hasEuAccess(user?.roles)) {
    return null;
  }

  function handleDownloadTemplate() {
    downloadTemplate.mutate(undefined, {
      onError: (error) => {
        toast.error(
          extractApiErrorMessage(error) ??
            translateOr(t, "FA_TOAST_BOUNDARY_TEMPLATE_DOWNLOAD_ERROR", "Failed to download template"),
        );
      },
    });
  }

  function handleFileSelect(file: File) {
    setSelectedFileName(file.name);
    setResult(null);
    uploadBoundary.mutate(file, {
      onSuccess: (uploadResult) => {
        if (uploadResult.success) {
          setResult({ status: "success" });
          toast.success(
            translateOr(t, "FA_TOAST_BOUNDARY_DATA_UPLOAD_SUCCESS", "Boundary data uploaded successfully"),
          );
          return;
        }

        setResult({
          status: "error",
          errorCount: uploadResult.errorCount ?? 0,
          hasErrorFile: Boolean(uploadResult.errorFile),
          downloadResult: () => {
            if (uploadResult.errorFile) {
              downloadBlob(uploadResult.errorFile.blob, uploadResult.errorFile.filename);
            }
          },
        });
        toast.error(
          translateOr(t, "FA_TOAST_BOUNDARY_DATA_UPLOAD_DATA_ERROR", "Some rows failed validation"),
        );
      },
      onError: (error) => {
        setResult(null);
        toast.error(
          extractApiErrorMessage(error) ??
            translateOr(t, "FA_TOAST_BOUNDARY_DATA_UPLOAD_ERROR", "Failed to upload boundary data"),
        );
      },
    });
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={translateOr(t, "FA_ACTION_UPLOAD_BOUNDARY", "Upload Boundary Data")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "FA_LABEL_BOUNDARIES", "Boundaries"), to: euBoundariesPath() },
          { label: translateOr(t, "FA_ACTION_UPLOAD_BOUNDARY", "Upload Boundary Data") },
        ]}
      />

      <Card>
        <CardContent className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {translateOr(t, "FA_DOWNLOAD_BOUNDARY_TEMPLATE_PAGE_TITLE", "Download Template")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {translateOr(
              t,
              "FA_DOWNLOAD_BOUNDARY_TEMPLATE_PAGE_DESC",
              "Download the boundary template, fill it in, then upload it below.",
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={downloadTemplate.isPending}
            onClick={handleDownloadTemplate}
            className="gap-2"
          >
            <Download className="size-4" />
            {translateOr(t, "PM_DOWNLOAD_TEMPLATE", "Download Template")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {translateOr(t, "FA_UPLOAD_BOUNDARY_DATA_PAGE_TITLE", "Upload Boundary Data")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {translateOr(
              t,
              "FA_UPLOAD_BOUNDARY_DATA_PAGE_DESC",
              "Upload the filled-in boundary template to bulk-create boundaries.",
            )}
          </p>
          <FileUploadZone
            label={translateOr(t, "FA_UPLOAD_BOUNDARY_DATA_PAGE_TITLE", "Upload Boundary Data")}
            hint={translateOr(t, "CS_COMMON_TAP_TO_UPLOAD", "Tap to upload a file")}
            accept=".csv,.xls,.xlsx"
            uploading={uploadBoundary.isPending}
            selectedFileName={selectedFileName}
            onSelect={handleFileSelect}
          />
          {result?.status === "error" ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p>
                {result.errorCount} {translateOr(t, "FA_BOUNDARY_VALIDATION_FAILED", "rows failed validation")}
              </p>
              {result.hasErrorFile ? (
                <button
                  type="button"
                  onClick={result.downloadResult}
                  className="mt-1 cursor-pointer font-semibold underline"
                >
                  {translateOr(t, "CORE_COMMON_VIEW_ERRORS", "View errors")}
                </button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
