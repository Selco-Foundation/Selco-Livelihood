import { useAuthStore, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { useMutation } from "@tanstack/react-query";
import { Files, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getWorkflowActionConfig,
  isQuotationRequiredAction,
  isSupportedWorkflowAction,
} from "../../constants/workflow-actions";
import type { UploadedMediaEntry } from "../../types/create-incident";
import type {
  ComplaintDetailsData,
  MdmsReasonOption,
} from "../../types/incident-details";
import { uploadIncidentFile } from "../../services/file-upload";
import {
  fetchReasonOptions,
  updateIncidentAction,
} from "../../services/workflow";
import { buildUploadedDocuments } from "../../utils/create-incident-documents";
import { MAX_IMAGE_COUNT } from "../../utils/media-validation";
import { FormSelectField } from "../create/FormSelectField";

interface ComplaintActionDialogProps {
  action: string;
  complaintDetails: ComplaintDetailsData;
  onClose: () => void;
  onComplete: () => Promise<void>;
}

function translateOr(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return value === key ? fallback : value;
}

function getReasonLabel(t: (key: string) => string, action: string): string {
  return action === "OUT_OF_SCOPE"
    ? translateOr(t, "WF_OUT_OF_SCOPE_REASON", "Out of scope reason")
    : translateOr(t, "WF_DECLINE_REASON", "Decline reason");
}

function getOutOfWarrantyHelperText(
  t: (key: string) => string,
  action: string,
  endUserName: string,
): string | null {
  if (action !== "OUT_OF_WARRANTY") {
    return null;
  }
  return translateOr(
    t,
    "WF_OUT_OF_WARRANTY_HELPER",
    "By marking this ticket as Out of Warranty, you are expected to contact {endUserName} and resolve the issue through the appropriate offline process.",
  ).replace("{endUserName}", endUserName);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

interface ActionDocumentsFieldProps {
  requiresQuotation: boolean;
  documentsRequired: boolean;
  uploads: UploadedMediaEntry[];
  isUploading: boolean;
  maxFiles: number;
  onUpload: (files: FileList) => Promise<void>;
  onRemove: (index: number) => void;
  t: (key: string) => string;
}

function ActionDocumentsField({
  requiresQuotation,
  documentsRequired,
  uploads,
  isUploading,
  maxFiles,
  onUpload,
  onRemove,
  t,
}: ActionDocumentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const maxFilesReached = uploads.length >= maxFiles;
  const label = requiresQuotation
    ? translateOr(t, "WF_QUOTATION_DOCUMENT", "Quotation document")
    : translateOr(t, "WF_UPLOAD_FILES", "Upload Files");
  const accept = requiresQuotation
    ? ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : ".png,.jpg,.jpeg,.pdf,image/*,application/pdf";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-950">
        {label}
        {documentsRequired ? <span className="text-destructive"> *</span> : null}
      </label>

      <button
        type="button"
        disabled={isUploading || maxFilesReached}
        onClick={() => inputRef.current?.click()}
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-ink-300 bg-card py-6 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-[#D2EBD8] bg-accent text-primary">
          <Files className="size-5" />
        </span>
        <span className="text-sm text-ink-950">
          {translateOr(t, "WF_TAP_TO_UPLOAD", "Tap to upload files")}
        </span>
      </button>
      <p className="text-xs text-ink-400">
        {maxFilesReached
          ? translateOr(
              t,
              "WF_MAX_FILES_REACHED",
              "You can upload up to {MAX_COUNT} files",
            ).replace("{MAX_COUNT}", String(maxFiles))
          : translateOr(t, "WF_MAX_FILES_HINT", "You can upload up to {MAX_COUNT} files").replace(
              "{MAX_COUNT}",
              String(maxFiles),
            )}
      </p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={!requiresQuotation}
        disabled={isUploading || maxFilesReached}
        onChange={(event) => {
          if (event.target.files?.length) {
            onUpload(event.target.files).catch(() => {});
            event.target.value = "";
          }
        }}
      />

      {uploads.length > 0 ? (
        <div className="space-y-3">
          {uploads.map((upload, index) => (
            <div
              key={`${upload.file.name}-${index}`}
              className="flex items-center gap-3 rounded border border-ink-300 p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground uppercase">
                {upload.file.name.split(".").pop()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-600">{upload.file.name}</p>
                <p className="text-sm text-ink-600">{formatFileSize(upload.file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={translateOr(t, "CS_COMMON_REMOVE", "Remove")}
                className="shrink-0 cursor-pointer text-ink-400 hover:text-destructive"
              >
                <Trash2 className="size-5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ComplaintActionDialog({
  action,
  complaintDetails,
  onClose,
  onComplete,
}: ComplaintActionDialogProps) {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const actionConfig = getWorkflowActionConfig(action);

  const [comments, setComments] = useState("");
  const [reasonOptions, setReasonOptions] = useState<MdmsReasonOption[]>([]);
  const [selectedReason, setSelectedReason] = useState<MdmsReasonOption | null>(null);
  const [uploads, setUploads] = useState<UploadedMediaEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!actionConfig?.reasonMaster || !accessToken) {
      setReasonOptions([]);
      return;
    }
    void fetchReasonOptions(accessToken, user, [actionConfig.reasonMaster]).then((masters) => {
      setReasonOptions(
        (masters[actionConfig.reasonMaster!] ?? []).filter(
          (option) => option.active !== false,
        ),
      );
    });
  }, [accessToken, actionConfig?.reasonMaster, user]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user || !accessToken || !actionConfig || !isSupportedWorkflowAction(action)) {
        throw new Error("AUTH_REQUIRED");
      }
      if (actionConfig.comment === "required" && !comments.trim()) {
        throw new Error("COMMENT_REQUIRED");
      }
      if (actionConfig.reasonMaster && !selectedReason) {
        throw new Error("REASON_REQUIRED");
      }
      if (actionConfig.documents === "required" && uploads.length === 0) {
        throw new Error("FILES_REQUIRED");
      }

      return updateIncidentAction({
        complaintDetails,
        action,
        comments: comments.trim(),
        documents: buildUploadedDocuments(uploads),
        outOfScopeReason: action === "OUT_OF_SCOPE" ? selectedReason : null,
        declineReason: action === "DECLINE_POC" ? selectedReason : null,
        accessToken,
        user,
      });
    },
    onSuccess: async (response) => {
      if (!response?.IncidentWrappers) {
        const message =
          response?.Errors?.[0]?.message ??
          response?.message ??
          t("CS_COMMON_SOMETHING_WENT_WRONG");
        setError(message);
        return;
      }
      await onComplete();
    },
    onError: (mutationError: Error) => {
      const code = mutationError.message;
      const message =
        code === "COMMENT_REQUIRED"
          ? translateOr(t, "WF_COMMENT_REQUIRED", "Please enter a comment")
          : code === "FILES_REQUIRED"
            ? translateOr(
                t,
                "WF_QUOTATION_REQUIRED",
                "Please upload a quotation document",
              )
            : code === "REASON_REQUIRED"
              ? translateOr(t, "WF_REASON_REQUIRED", "Please select a reason")
              : t("CS_COMMON_SOMETHING_WENT_WRONG");
      setError(message);
    },
  });

  const handleUpload = async (files: FileList) => {
    if (!accessToken) {
      return;
    }

    const filesToUpload = Array.from(files);
    if (uploads.length + filesToUpload.length > MAX_IMAGE_COUNT) {
      setError(
        translateOr(
          t,
          "WF_MAX_FILES_REACHED",
          "You can upload up to {MAX_COUNT} files",
        ).replace("{MAX_COUNT}", String(MAX_IMAGE_COUNT)),
      );
      return;
    }

    if (requiresQuotation) {
      const hasImage = filesToUpload.some((file) =>
        file.type.startsWith("image/"),
      );
      if (hasImage) {
        setError(
          translateOr(
            t,
            "WF_QUOTATION_IMAGE_NOT_ALLOWED",
            "Quotation must be a document (PDF or Word), not an image",
          ),
        );
        return;
      }
    }
    setError(null);
    setIsUploading(true);
    try {
      const uploaded: UploadedMediaEntry[] = [];
      for (const file of filesToUpload) {
        const result = await uploadIncidentFile(
          file,
          complaintDetails.tenantId,
          accessToken,
        );
        uploaded.push({
          file,
          fileStoreId: result.fileStoreId,
          kind: "image",
        });
      }
      setUploads((prev) => [...prev, ...uploaded]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, entryIndex) => entryIndex !== index));
  };

  if (!actionConfig) {
    return null;
  }

  const showDocuments = actionConfig.documents !== "none";
  const requiresQuotation = isQuotationRequiredAction(action);
  const reasonLabel = getReasonLabel(t, action);

  const endUserName =
    complaintDetails.incident.reporter?.name ??
    translateOr(t, "CS_COMMON_END_USER", "the end user");
  const outOfWarrantyHelperText = getOutOfWarrantyHelperText(t, action, endUserName);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
          onClose();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={translateOr(t, "CS_COMMON_CLOSE", "Close")}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card px-6 py-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-xl leading-[30px] font-semibold text-ink-950">
          {t(`CS_ACTION_${action}`)}
        </h2>

        <div className="mt-4 space-y-4">
          {actionConfig.reasonMaster ? (
            <FormSelectField
              label={reasonLabel}
              required
              value={selectedReason?.code ?? ""}
              options={reasonOptions.map((reason) => ({
                code: reason.code ?? reason.localizedCode ?? "",
                name: t(reason.localizedCode ?? reason.code ?? ""),
              }))}
              onChange={(option) =>
                setSelectedReason(
                  reasonOptions.find(
                    (reason) =>
                      reason.code === option?.code ||
                      reason.localizedCode === option?.code,
                  ) ?? null,
                )
              }
            />
          ) : null}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink-950">
              {t("WF_COMMON_COMMENTS")}
              {actionConfig.comment === "required" ? (
                <span className="text-destructive"> *</span>
              ) : null}
            </label>
            <textarea
              className="min-h-[100px] w-full rounded border border-ink-300 bg-card px-3 py-2 text-sm placeholder:text-ink-300"
              placeholder={translateOr(t, "WF_COMMENTS_PLACEHOLDER", "Describe the issue in detail...")}
              value={comments}
              onChange={(event) => setComments(event.target.value)}
            />
          </div>

          {showDocuments ? (
            <ActionDocumentsField
              requiresQuotation={requiresQuotation}
              documentsRequired={actionConfig.documents === "required"}
              uploads={uploads}
              isUploading={isUploading}
              maxFiles={MAX_IMAGE_COUNT}
              onUpload={handleUpload}
              onRemove={handleRemoveUpload}
              t={t}
            />
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {outOfWarrantyHelperText ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {outOfWarrantyHelperText}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            {t("TL_COMMON_CANCEL")}
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={mutation.isPending || isUploading}
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
          >
            {mutation.isPending ? t("CS_COMMON_SUBMITTING") : t("CS_COMMON_SUBMIT")}
          </Button>
        </div>
      </div>
    </div>
  );
}
