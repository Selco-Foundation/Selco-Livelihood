import { useAuthStore, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getWorkflowActionConfig,
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
    setIsUploading(true);
    try {
      const uploaded: UploadedMediaEntry[] = [];
      for (const file of Array.from(files)) {
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

  if (!actionConfig) {
    return null;
  }

  const showDocuments = actionConfig.documents !== "none";
  const reasonLabel =
    action === "OUT_OF_SCOPE"
      ? translateOr(t, "WF_OUT_OF_SCOPE_REASON", "Out of scope reason")
      : translateOr(t, "WF_DECLINE_REASON", "Decline reason");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground">
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
            <label className="text-sm font-medium text-foreground">
              {t("WF_COMMON_COMMENTS")}
              {actionConfig.comment === "required" ? " *" : null}
            </label>
            <textarea
              className="min-h-[100px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
            />
          </div>

          {showDocuments ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {action === "OUT_OF_WARRANTY"
                  ? translateOr(
                      t,
                      "WF_QUOTATION_DOCUMENT",
                      "Quotation document",
                    )
                  : translateOr(t, "INCIDENT_UPLOAD_IMAGE", "Supporting documents")}
                {actionConfig.documents === "required" ? " *" : null}
              </label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,image/*,application/pdf"
                multiple={action !== "OUT_OF_WARRANTY"}
                disabled={isUploading}
                onChange={(event) => {
                  if (event.target.files?.length) {
                    void handleUpload(event.target.files);
                    event.target.value = "";
                  }
                }}
              />
              {uploads.length > 0 ? (
                <p className="text-xs text-primary">
                  {uploads.length} file(s) attached
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("TL_COMMON_CANCEL")}
          </Button>
          <Button
            type="button"
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
