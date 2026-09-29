import { formatEpochToDate } from "./date-format";
import type { WorkflowBusinessServiceResponse } from "@/shared";
import type {
  WorkflowDetailsData,
  WorkflowProcessInstance,
  WorkflowTimelineCheckpoint,
} from "../types/incident-details";

function mergeCommentEvents(instances: WorkflowProcessInstance[]) {
  const timelineActions: WorkflowProcessInstance[] = [];
  let commentStack: WorkflowProcessInstance[] = [];

  for (const instance of instances) {
    if (instance.action === "COMMENT") {
      commentStack.push(instance);
      continue;
    }

    const wfComments = [
      ...commentStack,
      ...(instance.comment ? [instance] : []),
    ].map((entry) => ({ comment: entry.comment }));

    timelineActions.push({
      ...instance,
      wfComments,
    });
    commentStack = [];
  }

  return timelineActions;
}

function buildTimeline(
  instances: WorkflowProcessInstance[],
): WorkflowTimelineCheckpoint[] {
  return instances.map((instance) => ({
    performedAction: instance.action,
    status: instance.state?.applicationStatus,
    state: instance.state?.state,
    assigner: instance.assigner,
    rating: instance.rating,
    wfComment: instance.wfComments?.map((entry) => entry.comment ?? "").filter(Boolean),
    thumbnailsToShow: {
      thumbs: instance.thumbnailsToShow?.thumbs,
      fullImage: instance.thumbnailsToShow?.images,
      videos: instance.thumbnailsToShow?.videos,
    },
    assignes: instance.assignes,
    auditDetails: {
      created: formatEpochToDate(instance.auditDetails?.createdTime),
      lastModified: formatEpochToDate(instance.auditDetails?.lastModifiedTime),
      lastModifiedEpoch: instance.auditDetails?.lastModifiedTime,
    },
  }));
}

/**
 * Pure — assembles the final `WorkflowDetailsData` from the raw responses of
 * the two calls a workflow fetch needs (process search, business service)
 * plus process instances already enriched with media by the caller. The
 * caller (a hook) does the actual sequencing/fetching; this just shapes it.
 */
export function buildWorkflowDetailsData(
  currentInstance: WorkflowProcessInstance,
  businessServiceResponse: WorkflowBusinessServiceResponse,
  instancesWithMedia: WorkflowProcessInstance[],
  businessServiceName: string,
): WorkflowDetailsData {
  const states = businessServiceResponse.BusinessServices?.[0]?.states ?? [];
  const currentUuid = currentInstance.state?.uuid;
  const currentState = states.find((state) => state.uuid === currentUuid);

  const nextActions =
    currentInstance.nextActions?.map((action) => ({
      action: action.action ?? "",
      roles: action.roles,
    })) ?? [];

  const actionState = currentState
    ? {
        nextActions: currentState.actions?.map((action) => {
          const resultantState = states.find((state) => state.uuid === action.nextState);
          const assigneeRoles =
            resultantState?.actions?.flatMap((act) => act.roles ?? []) ?? [];
          return {
            action: action.action,
            roles: action.roles,
            assigneeRoles,
          };
        }),
      }
    : undefined;

  const merged = mergeCommentEvents(instancesWithMedia);
  const timeline = buildTimeline(merged);

  return {
    timeline,
    nextActions: nextActions.filter((action) => action.action),
    actionState,
    processInstances: instancesWithMedia,
    applicationBusinessService: businessServiceName,
  };
}
