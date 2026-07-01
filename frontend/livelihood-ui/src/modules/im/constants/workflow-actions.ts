export const SUPPORTED_WORKFLOW_ACTIONS = [
  "RESOLVE",
  "OUT_OF_SCOPE",
  "OUT_OF_WARRANTY",
  "DECLINE",
  "REASSIGN",
  "ASSIGN_VENDOR",
  "DECLINE_POC",
  "REOPEN",
] as const;

export type SupportedWorkflowAction = (typeof SUPPORTED_WORKFLOW_ACTIONS)[number];

export const SUPPORTED_WORKFLOW_ACTION_SET = new Set<string>(SUPPORTED_WORKFLOW_ACTIONS);

export type ReasonMaster = "OutOfScopeReasons" | "RejectReasons";

export interface WorkflowActionConfig {
  comment: "required" | "optional";
  documents: "required" | "optional" | "none";
  reasonMaster?: ReasonMaster;
}

export const WORKFLOW_ACTION_CONFIG: Record<SupportedWorkflowAction, WorkflowActionConfig> = {
  RESOLVE: { comment: "required", documents: "optional" },
  OUT_OF_SCOPE: {
    comment: "required",
    documents: "optional",
  },
  OUT_OF_WARRANTY: { comment: "optional", documents: "required" },
  DECLINE: { comment: "required", documents: "none" },
  REASSIGN: { comment: "optional", documents: "optional" },
  ASSIGN_VENDOR: { comment: "optional", documents: "optional" },
  DECLINE_POC: {
    comment: "optional",
    documents: "none",
    reasonMaster: "RejectReasons",
  },
  REOPEN: { comment: "required", documents: "none" },
};

export function isSupportedWorkflowAction(
  action: string,
): action is SupportedWorkflowAction {
  return SUPPORTED_WORKFLOW_ACTION_SET.has(action);
}

export function getWorkflowActionConfig(action: string): WorkflowActionConfig | null {
  return isSupportedWorkflowAction(action) ? WORKFLOW_ACTION_CONFIG[action] : null;
}
