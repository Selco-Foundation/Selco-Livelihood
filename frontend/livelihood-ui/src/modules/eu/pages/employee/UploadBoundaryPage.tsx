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
    | { status: "success"; duplicateCount: number; downloadResult: () => void }
    | { status: "error"; errorCount: number; duplicateCount: number; downloadResult: () => void }
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
        const downloadResult = () => downloadBlob(uploadResult.resultFile.blob, uploadResult.resultFile.filename);

        if (uploadResult.success) {
          setResult({ status: "success", duplicateCount: uploadResult.duplicateCount, downloadResult });
          toast.success(
            translateOr(t, "FA_TOAST_BOUNDARY_DATA_UPLOAD_SUCCESS", "Boundary data uploaded successfully"),
          );
          return;
        }

        setResult({
          status: "error",
          errorCount: uploadResult.errorCount,
          duplicateCount: uploadResult.duplicateCount,
          downloadResult,
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
            size="sm"
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
          {result?.status === "success" ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
              <p>{translateOr(t, "FA_TOAST_BOUNDARY_DATA_UPLOAD_SUCCESS", "Boundary data uploaded successfully")}</p>
              {result.duplicateCount > 0 ? (
                <p className="text-muted-foreground">
                  {result.duplicateCount}{" "}
                  {translateOr(t, "FA_BOUNDARY_DUPLICATE_SKIPPED", "boundaries already existed and were skipped")}
                </p>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={result.downloadResult}>
                <Download className="size-4" />
                {translateOr(t, "CORE_COMMON_DOWNLOAD", "Download")}
              </Button>
            </div>
          ) : null}
          {result?.status === "error" ? (
            <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p>
                {result.errorCount} {translateOr(t, "FA_BOUNDARY_VALIDATION_FAILED", "rows failed validation")}
              </p>
              {result.duplicateCount > 0 ? (
                <p>
                  {result.duplicateCount}{" "}
                  {translateOr(t, "FA_BOUNDARY_DUPLICATE_SKIPPED", "boundaries already existed and were skipped")}
                </p>
              ) : null}
              <Button type="button" variant="destructive" size="sm" onClick={result.downloadResult}>
                <Download className="size-4" />
                {translateOr(t, "CORE_COMMON_VIEW_ERRORS", "View errors")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
