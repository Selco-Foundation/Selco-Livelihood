import { apiClient } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { AuthUser } from "@/shared/stores/auth-store";

const INSTALLATION_VENDOR_SUB_TYPE = "INSTALLATION_VENDOR";
const ACTIVE_ORG_STATUS = "ACTIVE";

export interface VendorOrganisation {
  code: string;
  name: string;
}

export interface VendorOrgUser {
  code: string;
  name: string;
  email?: string;
}

interface RawOrganisation {
  id?: string;
  name?: string;
  orgSubType?: string;
  orgStatus?: string;
}

interface RawOrgUser {
  id?: string;
  userId?: string;
  user?: { name?: string; emailId?: string };
}

/**
 * `POST /vendor/organisation/v1/_search` — no boolean `active` field exists on this criteria, only
 * a string `orgStatus`; confirmed live it's `"ACTIVE"`. The response array key is the lowercase
 * `organisations` (not `Organisations`) — proven live: reading the capitalized key silently
 * returned undefined, so the Vendor Organization dropdown was always empty regardless of data.
 */
export async function searchVendorOrganisations(
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<VendorOrganisation[]> {
  const { data } = await apiClient.post<{ organisations?: RawOrganisation[] }>(
    "/vendor/organisation/v1/_search",
    { RequestInfo: createRequestInfo(accessToken, user), SearchCriteria: { tenantId } },
    { params: { tenantId } },
  );

  return (data.organisations ?? [])
    .filter((org) => org.id && org.orgSubType === INSTALLATION_VENDOR_SUB_TYPE && org.orgStatus === ACTIVE_ORG_STATUS)
    .map((org) => ({ code: org.id!, name: org.name ?? org.id! }));
}

/**
 * `POST /vendor/organisation/v1/user/_search` — no filter fields exist beyond `organizationId`, so
 * every returned user is shown. Omitting `RequestInfo.userInfo.type` causes an opaque 400 NPE
 * (vendor-registry forwards to HRMS for enrichment) — `createRequestInfo` always includes it when
 * `user` is passed.
 */
export async function searchVendorOrgUsers(
  tenantId: string,
  organizationId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<VendorOrgUser[]> {
  const { data } = await apiClient.post<{ OrgUsers?: RawOrgUser[] }>(
    "/vendor/organisation/v1/user/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      OrgUser: { tenantId, organizationIds: [organizationId] },
    },
    { params: { tenantId, limit: 100, offset: 0 } },
  );

  return (data.OrgUsers ?? [])
    .filter((orgUser) => orgUser.userId || orgUser.id)
    .map((orgUser) => ({
      code: (orgUser.userId ?? orgUser.id)!,
      // name/email aren't top-level on OrgUser -- they're on the nested HRMS-enriched `user`
      // object. Reading them at the top level always missed, so the dropdown fell back to
      // showing the raw uuid as the name and left email permanently blank.
      name: orgUser.user?.name ?? (orgUser.userId ?? orgUser.id)!,
      email: orgUser.user?.emailId,
    }));
}
