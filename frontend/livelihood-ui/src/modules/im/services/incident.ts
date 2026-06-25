import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { JurisdictionBoundaries } from "@/shared";
import type {
  CreateIncidentResponse,
  SelectOption,
  VerificationDocument,
} from "../types/create-incident";
import type { LivelihoodAsset, LivelihoodFacility } from "../types/facility-asset";
import { searchInbox } from "./inbox";

export interface CreateIncidentInput {
  tenantId: string;
  endUser: LivelihoodFacility;
  asset: LivelihoodAsset;
  complaintType: SelectOption;
  comments?: string;
  uploadedDocuments: VerificationDocument[];
  user: AuthUser;
  accessToken: string;
}

const DUPLICATE_STATUSES = [
  "PENDINGFORASSIGNMENT",
  "PENDINGFORASSIGNMENT_RMS_DEVICE",
  "PENDINGFORASSIGNMENT_THEFT",
  "RMS_DEVICE_PENDING_TECH_POC",
  "PENDINGRESOLUTION",
  "OUT_OF_SCOPE",
  "OUT_OF_WARRANTY_PENDING_TECH_POC",
  "PENDING_REVISION",
  "OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2",
  "PENDING_ASSIGNMENT_SPARE_PART_NEEDED",
  "PENDING_ASSIGNMENT_OUT_OF_WARRANTY",
  "PENDING_RESOLUTION_OUT_OF_SCOPE",
  "PENDING_RESOLUTION_SPARE_PART_NEEDED",
  "PENDING_RESOLUTION_OUT_OF_WARRANTY",
].join(",");

export function buildVerificationDocuments(
  uploadedDocuments: VerificationDocument[],
): VerificationDocument[] {
  return uploadedDocuments.map((file) => ({
    ...file,
    documentType: file.documentType.toLowerCase().startsWith("video")
      ? "VIDEO"
      : file.documentType.toLowerCase().startsWith("image")
        ? "PHOTO"
        : file.documentType,
  }));
}

export function buildCreateIncidentPayload(input: CreateIncidentInput) {
  const incidentType =
    input.complaintType.serviceCode ??
    input.complaintType.key ??
    input.complaintType.code;

  return {
    incident: {
      tenantId: input.tenantId,
      facilityId: input.endUser.facilityId,
      assetId: input.asset.assetId,
      incidentType,
      boundaryCode: input.asset.boundaryCode,
      comments: input.comments ?? "",
      additionalDetail: {
        fileStoreId: input.uploadedDocuments,
        reopenreason: [],
        rejectReason: [],
        sendBackReason: [],
      },
      source: "web",
      reporter: {
        uuid: input.user.uuid,
        userName: input.user.userName,
        tenantId: input.user.tenantId ?? input.tenantId,
      },
    },
    workflow: {
      action: "CREATE",
      verificationDocuments: buildVerificationDocuments(input.uploadedDocuments),
    },
  };
}

export async function createIncident(
  input: CreateIncidentInput,
): Promise<CreateIncidentResponse> {
  const payload = buildCreateIncidentPayload(input);

  try {
    const { data } = await apiClient.post<CreateIncidentResponse>(
      "/im-services/v2/request/_create",
      {
        RequestInfo: createRequestInfo(input.accessToken, input.user),
        ...payload,
      },
      {
        params: { tenantId: input.tenantId },
      },
    );
    return data;
  } catch (error: unknown) {
    const axiosError = error as {
      response?: { data?: { Errors?: Array<{ message?: string }> } };
    };
    return axiosError.response?.data ?? { Errors: [{ message: "CREATE_FAILED" }] };
  }
}

export async function searchPotentialDuplicates(
  tenantId: string,
  jurisdiction: JurisdictionBoundaries,
  facilityId: string,
  incidentType: string,
  accessToken: string,
  user: AuthUser | null | undefined,
) {
  const data = await searchInbox(
    tenantId,
    jurisdiction,
    {
      limit: 100,
      offset: 0,
      services: ["Incident"],
      sortOrder: "DESC",
      facility: facilityId,
      incidentType,
      applicationStatus: DUPLICATE_STATUSES,
    },
    accessToken,
    user,
  );

  return (data.items ?? [])
    .map((item) => ({
      ticketId: item.businessObject?.incident?.incidentId ?? "",
      ticketTenantId: item.businessObject?.incident?.tenantId ?? tenantId,
    }))
    .filter((ticket) => ticket.ticketId);
}
