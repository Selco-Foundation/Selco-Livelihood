import { employeeHomePath, extractApiErrorMessage, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Button, Card, CardContent, Checkbox, TopBar, toast } from "@/ui";
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

  const [areFacilitiesOnmReady, setAreFacilitiesOnmReady] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>();
  const [result, setResult] = useState<
    { status: "success" } | { status: "error"; errorCount: number; downloadResult: () => void } | null
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
      { file, areFacilitiesOnmReady },
      {
        onSuccess: (uploadResult) => {
          if (uploadResult.status === "success") {
            setResult({ status: "success" });
            toast.success(translateOr(t, "FACILITY_DATA_UPLOAD_SUCCESS", "Facility data uploaded successfully"));
            return;
          }

          setResult({
            status: "error",
            errorCount: uploadResult.errorCount,
            downloadResult: () => downloadBlob(uploadResult.resultFile.blob, uploadResult.resultFile.filename),
          });
          toast.error(translateOr(t, "HEALTH_FACILITIES_VALIDATION_FAILED", "Some rows failed validation"));
        },
        onError: (error) => {
          setResult(null);
          toast.error(
            extractApiErrorMessage(error) ??
              translateOr(t, "FACILITY_DATA_UPLOAD_ERROR", "Failed to upload facility data"),
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
        <CardContent>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
            <Checkbox
              checked={areFacilitiesOnmReady}
              onCheckedChange={(checked) => setAreFacilitiesOnmReady(checked === true)}
            />
            {translateOr(t, "FACILITY_IS_ONM_READY", "Mark uploaded end user sites as ONM Ready")}
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {translateOr(t, "PM_CREATE_PROJECT_HEAD_UPLOAD_FACILITY_DATA", "Upload Facility Data")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {translateOr(
              t,
              "PM_CREATE_PROJECT_HEAD_UPLOAD_FACILITY_DATA_DESC",
              "Upload the filled-in template to bulk-create end user sites.",
            )}
          </p>
          <FileUploadZone
            label={translateOr(t, "PM_CREATE_PROJECT_HEAD_UPLOAD_FACILITY_DATA", "Upload Facility Data")}
            hint={translateOr(t, "CS_COMMON_TAP_TO_UPLOAD", "Tap to upload a file")}
            accept=".xls,.xlsx"
            uploading={bulkAddFacilities.isPending}
            selectedFileName={selectedFileName}
            onSelect={handleFileSelect}
          />
          {result?.status === "error" ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p>
                {result.errorCount} {translateOr(t, "HEALTH_FACILITIES_VALIDATION_FAILED", "rows failed validation")}
              </p>
              <button
                type="button"
                onClick={result.downloadResult}
                className="mt-1 cursor-pointer font-semibold underline"
              >
                {translateOr(t, "CORE_COMMON_VIEW_ERRORS", "View errors")}
              </button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
