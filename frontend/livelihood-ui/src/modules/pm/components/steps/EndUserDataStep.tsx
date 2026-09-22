import { translateOr, useTranslate } from "@/shared";
import { FileSpreadsheet } from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle } from "react";
import { useFacilityIngestion } from "../../hooks/use-facility-ingestion";
import type { GeographyDetails } from "../../types/project";
import { FileIngestionPanel } from "../FileIngestionPanel";
import { StepSectionCard } from "../StepSectionCard";

export interface EndUserDataStepHandle {
  submit: () => Promise<void>;
}

interface EndUserDataStepProps {
  projectId: string | undefined;
  geographyDetails: GeographyDetails;
  onComplete: () => Promise<void>;
  /** Reports whether an async download/validate/create call is in flight,
   *  so the parent can disable step navigation while one is running. */
  onBusyChange?: (isBusy: boolean) => void;
  /** Lets the wizard footer enable Submit only after end-user data is applied. */
  onSubmitAvailabilityChange?: (isAvailable: boolean) => void;
}

export const EndUserDataStep = forwardRef<EndUserDataStepHandle, EndUserDataStepProps>(function EndUserDataStep({
  projectId,
  geographyDetails,
  onComplete,
  onBusyChange,
  onSubmitAvailabilityChange,
}, ref) {
  const { t } = useTranslate();
  const {
    status,
    errorCount,
    errorMessage,
    downloadTemplate,
    uploadAndValidate,
    downloadErrorReport,
    isBusy,
  } = useFacilityIngestion(projectId, geographyDetails);
  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  const handleSubmit = useCallback(async () => {
    await onComplete();
  }, [onComplete]);

  useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit]);

  useEffect(() => {
    onSubmitAvailabilityChange?.(status === "done" && !isBusy);
  }, [isBusy, onSubmitAvailabilityChange, status]);

  return (
    <StepSectionCard
      icon={FileSpreadsheet}
      title={translateOr(t, "ES_PM_END_USER_DATA", "End User Data")}
      description={translateOr(
        t,
        "ES_PM_END_USER_DATA_DESC",
        "Download the facility template, fill it in, and upload it back",
      )}
    >
      <FileIngestionPanel
        status={status}
        errorCount={errorCount}
        errorMessage={errorMessage}
        isBusy={isBusy}
        downloadLabel={translateOr(t, "ES_PM_DOWNLOAD_TEMPLATE", "Download Template")}
        onDownload={downloadTemplate}
        accept=".xlsx,.csv"
        uploadHint={translateOr(t, "ES_PM_UPLOAD_HINT", "Click to upload the filled-in template")}
        doneMessage={translateOr(t, "ES_PM_FILE_UPLOADED_SUCCESSFULLY", "File uploaded successfully")}
        onFileSelected={(file) => void uploadAndValidate(file)}
        onDownloadErrorReport={downloadErrorReport}
      />
    </StepSectionCard>
  );
});
