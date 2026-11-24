import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type {
  CreateIncidentResponse,
  SelectOption,
  VerificationDocument,
} from "../types/create-incident";
import type { LivelihoodAsset, LivelihoodFacility } from "../types/facility-asset";
import { hasRole } from "../utils/access";

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

  const isPocCreate = hasRole(input.user.roles, "LIVELIHOOD_POC");
  const additionalDetail =
    input.uploadedDocuments.length > 0
      ? { additionalDetail: { fileStoreId: input.uploadedDocuments } }
      : {};

  if (isPocCreate) {
    return {
      incident: {
        incidentType,
        reporterType: "COMPLAINANT",
        tenantId: input.tenantId,
        accountId: input.endUser.endUserUuid,
        reporterTenant: input.tenantId,
        facilityId: input.endUser.facilityId,
        assetId: input.asset.assetId,
        boundaryCode: input.asset.boundaryCode,
        comments: input.comments ?? "",
        createdOnBehalf: true,
        entryChannel: "POC_MANUAL",
        reporter: buildOnBehalfReporter(input.endUser, input.tenantId),
        ...additionalDetail,
      },
      workflow: {
        action: "CREATE",
        verificationDocuments: buildVerificationDocuments(input.uploadedDocuments),
      },
    };
  }

  return {
    incident: {
      tenantId: input.tenantId,
      facilityId: input.endUser.facilityId,
      assetId: input.asset.assetId,
      incidentType,
      boundaryCode: input.asset.boundaryCode,
      comments: input.comments ?? "",
      entryChannel: "DIRECT",
      reporter: {
        uuid: input.user.uuid,
        userName: input.user.userName,
        name: input.user.name,
        tenantId: input.user.tenantId ?? input.tenantId,
        type: "EMPLOYEE",
      },
      ...additionalDetail,
    },
    workflow: {
      action: "CREATE",
      verificationDocuments: buildVerificationDocuments(input.uploadedDocuments),
    },
  };
}

function buildOnBehalfReporter(endUser: LivelihoodFacility, tenantId: string) {
  return {
    uuid: endUser.endUserUuid,
    userName: endUser.facilityPocUsername,
    name: endUser.facilityPocName,
    mobileNumber: endUser.facilityPocPhone,
    emailId: endUser.facilityPocEmail,
    type: "EMPLOYEE",
    tenantId,
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
