import { apiClient } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { AuthUser } from "@/shared/stores/auth-store";

export type ComponentType = "SOLAR" | "MACHINE";

export interface VendorAssignmentAsset {
  componentType: ComponentType;
  componentSequence: number;
  assetName?: string;
  vendorOrgId?: string;
  vendorOrgName?: string;
  vendorUserId?: string;
  vendorUserName?: string;
  vendorEmail?: string;
  reportNumber?: string;
}

export interface VendorAssignmentSite {
  facilityId: string;
  siteName?: string;
  solutionId?: string;
  assets: VendorAssignmentAsset[];
}

export interface VendorAssignmentSearchResult {
  sites: VendorAssignmentSite[];
  totalAssets: number;
  assignable: boolean;
  planStatus?: string;
}

export interface VendorAssignmentInput {
  facilityId: string;
  componentType: ComponentType;
  componentSequence: number;
  vendorOrgId?: string;
  vendorOrgName?: string;
  vendorUserId?: string;
}

/**
 * `POST /activity/v1/vendor-assignment/_search` — derives the asset list (one SOLAR asset per
 * site, plus one MACHINE asset per line item in that site's Solution template); creates nothing.
 * This is the real, only source for Technician Assignment's rows — no separate asset/machine
 * catalog exists in the backend.
 */
export async function searchVendorAssignment(
  fieldPlanId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<VendorAssignmentSearchResult> {
  const { data } = await apiClient.post<{
    Sites?: VendorAssignmentSite[];
    TotalAssets?: number;
    assignable?: boolean;
    planStatus?: string;
  }>("/activity/v1/vendor-assignment/_search", {
    RequestInfo: createRequestInfo(accessToken, user),
    VendorAssignment: { tenantId: user?.tenantId, fieldPlanId },
  });

  return {
    sites: data.Sites ?? [],
    totalAssets: data.TotalAssets ?? 0,
    assignable: data.assignable ?? false,
    planStatus: data.planStatus,
  };
}

/**
 * `POST /activity/v1/vendor-assignment/_validate` — writes nothing, always 200s; read `valid`/
 * `Errors`. Call this before the irreversible `_create` submit to surface
 * `REVIEWER_MISSING`/`VENDOR_MISMATCH`/etc. per row.
 */
export async function validateVendorAssignment(
  fieldPlanId: string,
  assignments: VendorAssignmentInput[],
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ valid: boolean; errors: Array<{ message?: string; facilityId?: string; componentType?: string }> }> {
  const { data } = await apiClient.post<{
    valid?: boolean;
    Errors?: Array<{ message?: string; facilityId?: string; componentType?: string }>;
  }>("/activity/v1/vendor-assignment/_validate", {
    RequestInfo: createRequestInfo(accessToken, user),
    VendorAssignment: { tenantId: user?.tenantId, fieldPlanId },
    Assignments: assignments,
  });

  return { valid: data.valid ?? false, errors: data.Errors ?? [] };
}
