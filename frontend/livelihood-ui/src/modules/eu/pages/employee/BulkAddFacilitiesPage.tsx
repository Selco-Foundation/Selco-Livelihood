import { employeeHomePath, extractApiErrorMessage, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Button, Card, CardContent, TopBar, toast } from "@/ui";
import { Download } from "lucide-react";
import { useState } from "react";
import { FileUploadZone } from "../../components/upload/FileUploadZone";
import { useBulkAddFacilities } from "../../hooks/use-bulk-add-facilities";
import { useDownloadFacilityTemplate } from "../../hooks/use-download-facility-template";
import { downloadBlob } from "../../services/ingestion";
import { hasEuAccess } from "../../utils/access";
import { euFacilitiesPath } from "../../utils/paths";

export function BulkAddFacilitiesPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);

  const [selectedFileName, setSelectedFileName] = useState<string>();
  const [result, setResult] = useState<
    | { status: "success"; downloadResult: () => void }
    | { status: "error"; errorCount: number; downloadResult: () => void }
    | null
  >(null);

  const downloadTemplate = useDownloadFacilityTemplate();
  const bulkAddFacilities = useBulkAddFacilities();

  if (!hasEuAccess(user?.roles)) {
    return null;
  }

  function handleDownloadTemplate() {
    downloadTemplate.mutate(undefined, {
      onError: (error) => {
        toast.error(
          extractApiErrorMessage(error) ??
            translateOr(t, "FACILITY_TEMPLATE_DOWNLOAD_ERROR", "Failed to download template"),
        );
      },
    });
  }

  function handleFileSelect(file: File) {
    setSelectedFileName(file.name);
    setResult(null);
    bulkAddFacilities.mutate(
      { file },
      {
        onSuccess: (uploadResult) => {
          const downloadResult = () => downloadBlob(uploadResult.resultFile.blob, uploadResult.resultFile.filename);

          if (uploadResult.status === "success") {
            setResult({ status: "success", downloadResult });
            toast.success(
              translateOr(t, "FACILITY_END_USER_DATA_UPLOAD_SUCCESS", "End User data uploaded successfully"),
            );
            return;
          }

          setResult({ status: "error", errorCount: uploadResult.errorCount, downloadResult });
          toast.error(translateOr(t, "HEALTH_FACILITIES_VALIDATION_FAILED", "Some rows failed validation"));
        },
        onError: (error) => {
          setResult(null);
          toast.error(
            extractApiErrorMessage(error) ??
              translateOr(t, "FACILITY_END_USER_DATA_UPLOAD_ERROR", "Failed to upload end user data"),
          );
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={translateOr(t, "BULK_ADD", "Bulk Add")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "END_USER_SITES", "End User Sites"), to: euFacilitiesPath() },
          { label: translateOr(t, "BULK_ADD", "Bulk Add") },
        ]}
      />

      <Card>
        <CardContent className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {translateOr(
              t,
              "PM_CREATE_PROJECT_HEAD_DOWNLOAD_FACILITY_TEMPLATE",
              "Download Template",
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            {translateOr(
              t,
              "PM_CREATE_PROJECT_HEAD_DOWNLOAD_FACILITY_TEMPLATE_DESC",
              "Download the end user site template, fill it in, then upload it below.",
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
            {translateOr(t, "FACILITY_UPLOAD_END_USER_DATA", "Upload End User Data")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {translateOr(
              t,
              "PM_CREATE_PROJECT_HEAD_UPLOAD_FACILITY_DATA_DESC",
              "Upload the filled-in template to bulk-create end user sites.",
            )}
          </p>
          <FileUploadZone
            label={translateOr(t, "FACILITY_UPLOAD_END_USER_DATA", "Upload End User Data")}
            hint={translateOr(t, "CS_COMMON_TAP_TO_UPLOAD", "Tap to upload a file")}
            accept=".xls,.xlsx"
            uploading={bulkAddFacilities.isPending}
            selectedFileName={selectedFileName}
            onSelect={handleFileSelect}
          />
          {result?.status === "success" ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
              <p>
                {translateOr(t, "FACILITY_END_USER_DATA_UPLOAD_SUCCESS", "End User data uploaded successfully")}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={result.downloadResult}>
                <Download className="size-4" />
                {translateOr(t, "CORE_COMMON_DOWNLOAD", "Download")}
              </Button>
            </div>
          ) : null}
          {result?.status === "error" ? (
            <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p>
                {result.errorCount} {translateOr(t, "HEALTH_FACILITIES_VALIDATION_FAILED", "rows failed validation")}
              </p>
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
