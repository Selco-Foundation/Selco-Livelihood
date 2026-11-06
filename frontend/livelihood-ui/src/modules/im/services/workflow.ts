import { apiClient, fetchMdmsMasters, tenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { VerificationDocument } from "../types/create-incident";
import type {
  MdmsReasonOption,
  UpdateIncidentResponse,
  WorkflowProcessSearchResponse,
} from "../types/incident-details";
import type { ComplaintDetailsData, IncidentWrapper } from "../types/incident-details";

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
  outOfScopeReason?: MdmsReasonOption | null;
  declineReason?: MdmsReasonOption | null;
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
    // Preserve fields not modeled by IncidentAdditionalDetail (e.g. assetCategory) so update
    // actions don't wipe them out — the backend replaces this column wholesale on save.
    ...incident.additionalDetail,
    outOfScopeReason: [...(incident.additionalDetail?.outOfScopeReason ?? [])],
    declineReason: [...(incident.additionalDetail?.declineReason ?? [])],
    fileStoreId: incident.additionalDetail?.fileStoreId,
  };

  const outOfScopeReason =
    input.outOfScopeReason?.code ?? input.outOfScopeReason?.localizedCode;
  if (outOfScopeReason) {
    workflow.outOfScopeReason = outOfScopeReason;
    additionalDetail.outOfScopeReason.push(outOfScopeReason);
  }

  const declineReason =
    input.declineReason?.code ?? input.declineReason?.localizedCode;
  if (declineReason) {
    workflow.declineReason = declineReason;
    additionalDetail.declineReason.push(declineReason);
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
