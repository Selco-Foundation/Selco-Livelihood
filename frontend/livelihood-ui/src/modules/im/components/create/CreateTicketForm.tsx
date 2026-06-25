import { Button } from "@/ui";
import {
  Camera,
  ClipboardList,
  Info,
  Loader2,
  MapPin,
  RotateCcw,
  Send,
  Shield,
  Video,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useCreateIncidentForm } from "../../hooks/use-create-incident-form";
import { DuplicateTicketsDialog } from "./DuplicateTicketsDialog";
import { FormSectionCard } from "./FormSectionCard";
import { FormSelectField } from "./FormSelectField";
import { MediaUploadZone } from "./MediaUploadZone";

interface CreateTicketFormProps {
  inboxPath: string;
  responsePath: string;
}

export function CreateTicketForm({ inboxPath, responsePath }: CreateTicketFormProps) {
  const navigate = useNavigate();
  const {
    t,
    translateOr,
    form,
    fieldErrors,
    endUserOptions,
    assetOptions,
    facilityById,
    assetById,
    complaintTypes,
    showEndUserDropdown,
    isFacilitiesLoading,
    isAssetsLoading,
    imageUploads,
    videoUploads,
    uploadFiles,
    isImageUploading,
    isVideoUploading,
    disableUpload,
    duplicateTickets,
    setDuplicateTickets,
    canSubmit,
    submitError,
    setSubmitError,
    createMutation,
    clearForm,
    saveDraft,
    validate,
    handleEndUserChange,
    handleAssetChange,
    handleComplaintTypeChange,
    updateField,
  } = useCreateIncidentForm(inboxPath, responsePath);

  const handleSubmit = () => {
    setSubmitError(null);
    if (!validate()) {
      return;
    }
    if (!canSubmit) {
      return;
    }
    createMutation.mutate();
  };

  return (
    <>
      {createMutation.isPending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Loader2 className="size-10 animate-spin text-primary" />
        </div>
      ) : null}

      {duplicateTickets.length > 0 ? (
        <DuplicateTicketsDialog
          tickets={duplicateTickets}
          onContinue={() => setDuplicateTickets([])}
          onCancel={() => void navigate({ to: inboxPath })}
        />
      ) : null}

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <FormSectionCard
          icon={MapPin}
          title={translateOr(t, "TICKET_LOCATION", "Ticket Location")}
          description={translateOr(
            t,
            "TICKET_LOCATION_DESC",
            "Select the end user and asset for this ticket",
          )}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {showEndUserDropdown ? (
              <FormSelectField
                label={translateOr(t, "INCIDENT_END_USER", "End user")}
                required
                value={form.endUser?.facilityId ?? ""}
                options={endUserOptions}
                disabled={isFacilitiesLoading}
                error={fieldErrors.endUser}
                onChange={(option) =>
                  handleEndUserChange(
                    option ? (facilityById.get(option.code) ?? null) : null,
                  )
                }
              />
            ) : form.endUser ? (
              <div className="min-w-0 space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  {translateOr(t, "INCIDENT_END_USER", "End user")}
                </p>
                <p className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground">
                  {form.endUser.facilityPocName}
                </p>
              </div>
            ) : null}

            <FormSelectField
              label={translateOr(t, "INCIDENT_ASSET", "Asset")}
              required
              value={form.asset?.assetId ?? ""}
              options={assetOptions}
              disabled={!form.endUser || isAssetsLoading}
              error={fieldErrors.asset}
              onChange={(option) =>
                handleAssetChange(option ? (assetById.get(option.code) ?? null) : null)
              }
            />
          </div>
        </FormSectionCard>

        <FormSectionCard
          icon={ClipboardList}
          title={translateOr(t, "TICKET_DETAILS", "Ticket Details")}
          description={translateOr(
            t,
            "TICKET_DETAILS_DESC",
            "Describe the problem so we can help faster",
          )}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormSelectField
              label={translateOr(t, "TICKET_TYPE", "Issue Type")}
              required
              value={form.complaintType?.code ?? ""}
              options={complaintTypes}
              disabled={!form.asset}
              error={fieldErrors.complaintType}
              onChange={(option) => handleComplaintTypeChange(option)}
            />
          </div>
        </FormSectionCard>

        <FormSectionCard
          icon={Info}
          title={translateOr(t, "ADDITIONAL_DETAILS", "Additional Details")}
          description={translateOr(
            t,
            "ADDITIONAL_DETAILS_DESC",
            "Provide more information or media to help us resolve the issue",
          )}
        >
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label htmlFor="incident-comments" className="text-sm font-medium text-foreground">
                {translateOr(t, "INCIDENT_COMMENTS", "Comments")}
              </label>
              <textarea
                id="incident-comments"
                className="min-h-[120px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={translateOr(
                  t,
                  "INCIDENT_COMMENTS_PLACEHOLDER",
                  "Add any additional comments here...",
                )}
                maxLength={256}
                value={form.comments}
                onChange={(event) => updateField("comments", event.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MediaUploadZone
                label={translateOr(t, "INCIDENT_UPLOAD_IMAGE", "Upload Images")}
                hint={translateOr(t, "INCIDENT_TAP_UPLOAD_IMAGES", "Tap to upload images")}
                icon={Camera}
                accept=".png,.jpg,.jpeg,image/*"
                multiple
                disabled={disableUpload}
                uploading={isImageUploading}
                files={imageUploads.map((item) => item.file.name)}
                onSelect={(files) => void uploadFiles(files, "image")}
              />
              <MediaUploadZone
                label={translateOr(t, "INCIDENT_UPLOAD_VIDEO", "Upload Videos")}
                hint={translateOr(t, "INCIDENT_TAP_UPLOAD_VIDEOS", "Tap to upload videos")}
                icon={Video}
                accept=".mp4,.avi,.mov,.wmv,video/*"
                disabled={disableUpload}
                uploading={isVideoUploading}
                files={videoUploads.map((item) => item.file.name)}
                onSelect={(files) => void uploadFiles(files, "video")}
              />
            </div>
          </div>
        </FormSectionCard>

        {submitError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="size-4 shrink-0 text-primary" />
            {translateOr(
              t,
              "INCIDENT_DATA_SAFE",
              "Your data is safe and used only to resolve your ticket",
            )}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" className="gap-2" onClick={clearForm}>
              <RotateCcw className="size-4" />
              {translateOr(t, "INCIDENT_CLEAR_FORM", "Clear form")}
            </Button>
            <Button type="button" variant="outline" onClick={saveDraft}>
              {translateOr(t, "INCIDENT_SAVE_DRAFT", "Save draft")}
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={!canSubmit || createMutation.isPending}
            >
              <Send className="size-4" />
              {translateOr(t, "FILE_INCIDENT", "Submit ticket")}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
