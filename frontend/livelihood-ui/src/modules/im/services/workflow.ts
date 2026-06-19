import { apiClient, tenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { VerificationDocument } from "../types/create-incident";
import type {
  EmployeeSearchResult,
  MdmsReasonOption,
  UpdateIncidentResponse,
  WorkflowBusinessServiceResponse,
  WorkflowDetailsData,
  WorkflowProcessInstance,
  WorkflowProcessSearchResponse,
  WorkflowTimelineCheckpoint,
} from "../types/incident-details";
import { fetchMdmsMasters } from "./mdms";
import { resolveVerificationMedia } from "./incident-details";
import { formatEpochToDate } from "../utils/date-format";
import type {
  ComplaintDetailsData,
  IncidentWrapper,
  OowResponse,
  SpcResponse,
} from "../types/incident-details";

export async function searchWorkflowProcess(
  tenantId: string,
  businessId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<WorkflowProcessSearchResponse> {
  const { data } = await apiClient.post<WorkflowProcessSearchResponse>(
    "/egov-workflow-v2/egov-wf/process/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
    },
    {
      params: {
        tenantId,
        businessIds: businessId,
        history: true,
        isStateLevelCall: false,
      },
    },
  );

  return data;
}

export async function fetchWorkflowBusinessService(
  tenantId: string,
  businessService: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<WorkflowBusinessServiceResponse> {
  const { data } = await apiClient.post<WorkflowBusinessServiceResponse>(
    "/egov-workflow-v2/egov-wf/businessservice/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      tenantId,
      businessServices: [businessService],
    },
    { params: { tenantId } },
  );

  return data;
}

async function enrichProcessInstancesWithMedia(
  instances: WorkflowProcessInstance[],
  accessToken: string,
  user?: AuthUser | null,
) {
  const enriched: WorkflowProcessInstance[] = [];

  for (const instance of instances) {
    if (!instance.documents?.length) {
      enriched.push(instance);
      continue;
    }

    const media = await resolveVerificationMedia(
      instance.documents,
      instance.tenantId ?? "",
      accessToken,
      user,
    );

    enriched.push({
      ...instance,
      thumbnailsToShow: {
        thumbs: media.thumbs,
        images: media.images,
        videos: media.videos,
      },
    });
  }

  return enriched;
}

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

export async function fetchWorkflowDetails(
  tenantId: string,
  incidentId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<WorkflowDetailsData> {
  const workflowResponse = await searchWorkflowProcess(
    tenantId,
    incidentId,
    accessToken,
    user,
  );
  const processInstances = workflowResponse.ProcessInstances ?? [];

  if (!processInstances.length) {
    return {
      timeline: [],
      nextActions: [],
      processInstances: [],
    };
  }

  const currentInstance = processInstances[0];
  const businessServiceName = currentInstance.businessService ?? "Incident";

  const businessServiceResponse = await fetchWorkflowBusinessService(
    tenantId,
    businessServiceName,
    accessToken,
    user,
  );
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

  const withMedia = await enrichProcessInstancesWithMedia(
    processInstances,
    accessToken,
    user,
  );
  const merged = mergeCommentEvents(withMedia);
  let timeline = buildTimeline(merged);

  const pendingAssignment = timeline.filter(
    (checkpoint) => checkpoint.status === "PENDINGFORASSIGNMENT",
  );
  const lastPending = pendingAssignment.at(-1);
  if (lastPending) {
    timeline.push({
      ...lastPending,
      status: "COMPLAINT_FILED",
    });
  }

  return {
    timeline,
    nextActions: nextActions.filter((action) => action.action),
    actionState,
    processInstances: withMedia,
    applicationBusinessService: businessServiceName,
  };
}

export async function searchEmployeesForAssign(
  tenantId: string,
  roles: string,
  boundaryCode: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<EmployeeSearchResult[]> {
  interface HrmsEmployeeResponse {
    Employees?: Array<{
      user?: { uuid?: string; userName?: string };
    }>;
  }

  const { data } = await apiClient.get<HrmsEmployeeResponse>(
    "/egov-hrms/employees/_search",
    {
      params: {
        tenantId,
        roles,
        boundaryCodes: boundaryCode,
        isActive: true,
        searchOnlyInBoundary: true,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return (data.Employees ?? [])
    .map((employee) => ({
      uuid: employee.user?.uuid ?? "",
      name: employee.user?.userName ?? "",
    }))
    .filter((employee) => employee.uuid);
}

export async function fetchReasonOptions(
  accessToken: string,
  user: AuthUser | null | undefined,
  masterNames: string[],
): Promise<Record<string, MdmsReasonOption[]>> {
  const stateTenantId = tenantId();
  const masters = await fetchMdmsMasters(
    stateTenantId,
    "Incident",
    masterNames,
    accessToken,
    user,
  );

  const result: Record<string, MdmsReasonOption[]> = {};
  for (const name of masterNames) {
    result[name] = (masters[name] as MdmsReasonOption[]) ?? [];
  }
  return result;
}

export interface UpdateIncidentActionInput {
  complaintDetails: ComplaintDetailsData;
  action: string;
  assigneeUuid?: string | null;
  comments?: string;
  documents?: VerificationDocument[];
  reopenReason?: string;
  rejectReason?: MdmsReasonOption | null;
  sendBackReason?: MdmsReasonOption | null;
  outOfScopeReason?: MdmsReasonOption | null;
  oowResponses?: OowResponse;
  spcResponses?: SpcResponse;
  accessToken: string;
  user: AuthUser;
}

export async function updateIncidentAction(
  input: UpdateIncidentActionInput,
): Promise<UpdateIncidentResponse> {
  const { complaintDetails, action } = input;
  const incident = { ...complaintDetails.incident };
  const workflow = { ...complaintDetails.workflow };

  workflow.action = action;
  workflow.assignes = input.assigneeUuid ? [input.assigneeUuid] : null;
  workflow.comments = input.comments ?? "";
  workflow.verificationDocuments = input.documents ?? [];

  const additionalDetail = {
    reopenreason: [...(incident.additionalDetail?.reopenreason ?? [])],
    rejectReason: [...(incident.additionalDetail?.rejectReason ?? [])],
    sendBackReason: [...(incident.additionalDetail?.sendBackReason ?? [])],
    oowResponses: [...(incident.additionalDetail?.oowResponses ?? [])],
    outOfScopeReason: [...(incident.additionalDetail?.outOfScopeReason ?? [])],
    spcResponses: [...(incident.additionalDetail?.spcResponses ?? [])],
    fileStoreId: incident.additionalDetail?.fileStoreId,
  };

  if (input.reopenReason) {
    workflow.reopenreason = input.reopenReason;
    additionalDetail.reopenreason.push(input.reopenReason);
  }
  if (input.rejectReason?.localizedCode) {
    workflow.rejectReason = input.rejectReason.localizedCode;
    additionalDetail.rejectReason.push(input.rejectReason.localizedCode);
  }
  if (input.sendBackReason?.localizedCode) {
    workflow.sendBackReason = {
      reason: input.sendBackReason.localizedCode,
    };
    additionalDetail.sendBackReason.push({
      reason: input.sendBackReason.localizedCode,
    });
  }
  if (input.oowResponses) {
    workflow.oowResponses = input.oowResponses;
    additionalDetail.oowResponses.push(input.oowResponses);
  }
  if (input.outOfScopeReason?.localizedCode) {
    workflow.outOfScopeReason = input.outOfScopeReason.localizedCode;
    additionalDetail.outOfScopeReason.push(input.outOfScopeReason.localizedCode);
  }
  if (input.spcResponses) {
    workflow.spcResponses = input.spcResponses;
    additionalDetail.spcResponses.push(input.spcResponses);
  }

  incident.additionalDetail = additionalDetail;

  const payload: IncidentWrapper & { tenantId?: string } = {
    incident,
    workflow,
    tenantId: incident.tenantId,
  };

  try {
    const { data } = await apiClient.post<UpdateIncidentResponse>(
      "/im-services/v2/request/_update",
      {
        RequestInfo: createRequestInfo(input.accessToken, input.user),
        ...payload,
      },
      {
        params: { tenantId: incident.tenantId },
      },
    );
    return data;
  } catch (error: unknown) {
    const axiosError = error as {
      response?: { data?: UpdateIncidentResponse };
    };
    return axiosError.response?.data ?? { Errors: [{ message: "UPDATE_FAILED" }] };
  }
}
