import { useAuthStore, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { UploadedMediaEntry } from "../../types/create-incident";
import type {
  ComplaintDetailsData,
  EmployeeSearchResult,
  MdmsReasonOption,
  WorkflowDetailsData,
} from "../../types/incident-details";
import { uploadIncidentFile } from "../../services/file-upload";
import {
  fetchReasonOptions,
  searchEmployeesForAssign,
  updateIncidentAction,
} from "../../services/workflow";
import { buildUploadedDocuments } from "../../utils/create-incident-documents";
import { FormSelectField } from "../create/FormSelectField";

interface ComplaintActionDialogProps {
  action: string;
  complaintDetails: ComplaintDetailsData;
  workflowDetails: WorkflowDetailsData;
  onClose: () => void;
  onComplete: () => Promise<void>;
}

function translateOr(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return value === key ? fallback : value;
}

const ASSIGN_ACTIONS = new Set(["ASSIGN", "REASSIGN"]);
const REASON_ACTIONS = {
  REJECT: "RejectReasons",
  SENDBACK: "SendBackReasons",
  MARK_OUT_OF_SCOPE: "OutOfScopeReasons",
} as const;

export function ComplaintActionDialog({
  action,
  complaintDetails,
  workflowDetails,
  onClose,
  onComplete,
}: ComplaintActionDialogProps) {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  const [comments, setComments] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSearchResult | null>(null);
  const [employees, setEmployees] = useState<EmployeeSearchResult[]>([]);
  const [reasonOptions, setReasonOptions] = useState<MdmsReasonOption[]>([]);
  const [selectedReason, setSelectedReason] = useState<MdmsReasonOption | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [uploads, setUploads] = useState<UploadedMediaEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [oowIssue, setOowIssue] = useState("");
  const [oowRootCause, setOowRootCause] = useState("");
  const [oowRecommendedSolution, setOowRecommendedSolution] = useState("");
  const [oowTotalCostOfSolution, setOowTotalCostOfSolution] = useState("");
  const [oowTimeToResolve, setOowTimeToResolve] = useState("");
  const [spcRootAnalysis, setSpcRootAnalysis] = useState("");
  const [spcSparePartToBeReplaced, setSpcSparePartToBeReplaced] = useState("");

  const actionConfig = workflowDetails.actionState?.nextActions?.find(
    (entry) => entry.action === action,
  );
  const assigneeRoles = actionConfig?.assigneeRoles?.join(",") ?? "";
  const currentState = workflowDetails.processInstances[0]?.state?.state;
  const isRmsAssignmentToTechPoc =
    action === "ASSIGN" && currentState === "PENDINGFORASSIGNMENT_RMS_DEVICE";
  const needsAssignee = ASSIGN_ACTIONS.has(action) && !isRmsAssignmentToTechPoc;
  const needsFiles = action === "RESOLVE";

  const reopenOptions = useMemo(
    () => [
      t("CS_REOPEN_OPTION_ONE"),
      t("CS_REOPEN_OPTION_TWO"),
      t("CS_REOPEN_OPTION_THREE"),
      t("CS_REOPEN_OPTION_FOUR"),
      t("CS_REOPEN_OPTION_FIVE"),
    ],
    [t],
  );

  useEffect(() => {
    if (!needsAssignee || !accessToken || !assigneeRoles) {
      return;
    }
    void searchEmployeesForAssign(
      complaintDetails.tenantId,
      assigneeRoles,
      complaintDetails.incident.boundaryCode ?? "",
      accessToken,
      user,
    ).then(setEmployees);
  }, [
    accessToken,
    assigneeRoles,
    complaintDetails.incident.boundaryCode,
    complaintDetails.tenantId,
    needsAssignee,
    user,
  ]);

  useEffect(() => {
    const reasonMaster = REASON_ACTIONS[action as keyof typeof REASON_ACTIONS];
    if (!reasonMaster || !accessToken) {
      setReasonOptions([]);
      return;
    }
    void fetchReasonOptions(accessToken, user, [reasonMaster]).then((masters) => {
      setReasonOptions(
        (masters[reasonMaster] ?? []).filter((option) => option.active !== false),
      );
    });
  }, [accessToken, action, user]);

  useEffect(() => {
    if (action !== "REJECT" || !user?.uuid) {
      return;
    }
    setSelectedEmployee({
      uuid: user.uuid,
      name: user.userName ?? "",
    });
  }, [action, user]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user || !accessToken) {
        throw new Error("AUTH_REQUIRED");
      }
      if (needsAssignee && !selectedEmployee?.uuid) {
        throw new Error("ASSIGNEE_REQUIRED");
      }
      if (needsFiles && uploads.length === 0) {
        throw new Error("FILES_REQUIRED");
      }
      if ((action === "REOPEN" || action === "REOPEN_RMS") && !reopenReason) {
        throw new Error("REOPEN_REASON_REQUIRED");
      }
      if (REASON_ACTIONS[action as keyof typeof REASON_ACTIONS] && !selectedReason) {
        throw new Error("REASON_REQUIRED");
      }

      return updateIncidentAction({
        complaintDetails,
        action,
        assigneeUuid: selectedEmployee?.uuid ?? null,
        comments,
        documents: buildUploadedDocuments(uploads),
        reopenReason: reopenReason || undefined,
        rejectReason: action === "REJECT" ? selectedReason : null,
        sendBackReason: action === "SENDBACK" ? selectedReason : null,
        outOfScopeReason: action === "MARK_OUT_OF_SCOPE" ? selectedReason : null,
        oowResponses:
          action === "OUT_OF_WARRANTY" || action === "SUBMIT"
            ? {
                oowIssue,
                oowRootCause,
                oowRecommendedSolution,
                oowTotalCostOfSolution,
                oowTimeToResolve,
              }
            : undefined,
        spcResponses:
          action === "SPARE_PART_NEEDED"
            ? { spcRootAnalysis, spcSparePartToBeReplaced }
            : undefined,
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
        code === "ASSIGNEE_REQUIRED"
          ? translateOr(t, "WF_ASSIGNEE_REQUIRED", "Please select an assignee")
          : code === "FILES_REQUIRED"
            ? translateOr(t, "WF_FILES_REQUIRED", "Please upload supporting files")
            : code === "REOPEN_REASON_REQUIRED"
              ? translateOr(t, "CS_REOPEN_REASON_REQUIRED", "Please select a reopen reason")
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground">
          {t(`CS_ACTION_${action}`)}
        </h2>

        <div className="mt-4 space-y-4">
          {needsAssignee ? (
            <FormSelectField
              label={translateOr(t, "WF_ASSIGNEE", "Assignee")}
              required
              value={selectedEmployee?.uuid ?? ""}
              options={employees.map((employee) => ({
                code: employee.uuid,
                name: employee.name,
              }))}
              onChange={(option) =>
                setSelectedEmployee(
                  option
                    ? { uuid: option.code, name: option.name }
                    : null,
                )
              }
            />
          ) : null}

          {(action === "REOPEN" || action === "REOPEN_RMS") ? (
            <FormSelectField
              label={translateOr(t, "CS_REOPEN_REASON", "Reopen reason")}
              required
              value={reopenReason}
              options={reopenOptions.map((reason) => ({
                code: reason,
                name: reason,
              }))}
              onChange={(option) => setReopenReason(option?.code ?? "")}
            />
          ) : null}

          {REASON_ACTIONS[action as keyof typeof REASON_ACTIONS] ? (
            <FormSelectField
              label={translateOr(t, "WF_REASON", "Reason")}
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

          {action === "OUT_OF_WARRANTY" || action === "SUBMIT" ? (
            <div className="space-y-3">
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder={t("OOW_ACTION_ISSUE_OBSERVATION")}
                value={oowIssue}
                onChange={(event) => setOowIssue(event.target.value)}
              />
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder={t("OOW_ACTION_ISSUE_ROOT_CAUSE")}
                value={oowRootCause}
                onChange={(event) => setOowRootCause(event.target.value)}
              />
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder={t("OOW_ACTION_ISSUE_SOLUTION")}
                value={oowRecommendedSolution}
                onChange={(event) => setOowRecommendedSolution(event.target.value)}
              />
              <input
                className="h-10 w-full rounded-md border border-input px-3 text-sm"
                placeholder={t("OOW_ACTION_ISSUE_RESOLUTION_TIME")}
                value={oowTimeToResolve}
                onChange={(event) => setOowTimeToResolve(event.target.value)}
              />
              <input
                className="h-10 w-full rounded-md border border-input px-3 text-sm"
                placeholder={t("OOW_ACTION_ISSUE_SOLUTION_COST")}
                value={oowTotalCostOfSolution}
                onChange={(event) => setOowTotalCostOfSolution(event.target.value)}
              />
            </div>
          ) : null}

          {action === "SPARE_PART_NEEDED" ? (
            <div className="space-y-3">
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder={t("SPC_ACTION_ROOT_CAUSE_ANALYSIS")}
                value={spcRootAnalysis}
                onChange={(event) => setSpcRootAnalysis(event.target.value)}
              />
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder={t("SPC_ACTION_SPARE_PART_TO_BE_REPLACED")}
                value={spcSparePartToBeReplaced}
                onChange={(event) => setSpcSparePartToBeReplaced(event.target.value)}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t("WF_COMMON_COMMENTS")}
            </label>
            <textarea
              className="min-h-[100px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
            />
          </div>

          {needsFiles ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {translateOr(t, "INCIDENT_UPLOAD_IMAGE", "Upload proof")}
              </label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,image/*"
                multiple
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
