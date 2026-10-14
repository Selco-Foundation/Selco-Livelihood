import { postSearch } from "@/shared";
import type { AuthUser } from "@/shared/stores/auth-store";
import { BULK_PAGE_SIZE } from "../utils/url-params";

const VENDOR_ORG_TYPE = "VENDOR";
const ACTIVE_ORG_STATUS = "ACTIVE";
/** Field Staff -- the only org users who fill IC Reports, so the only ones assignable as a vendor. */
const FIELD_STAFF_ROLE = "INSTALLATION_REPORT_PART_A_EDITOR";

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
  id: string;
  name?: string;
}

interface RawOrgUser {
  id?: string;
  userId?: string;
  user?: { name?: string; emailId?: string; roles?: { code?: string }[] };
}

/**
 * `POST /vendor/organisation/v1/_search` — filtered server-side by `orgType: "VENDOR"` (excludes
 * PLATFORM orgs) and `orgStatus: "ACTIVE"` (no boolean `active` field exists on this criteria).
 * `orgSubType` is deprecated and null on every org, so it is neither sent nor read. The response
 * array key is the lowercase
 * `organisations` (not `Organisations`) — proven live: reading the capitalized key silently
 * returned undefined, so the Vendor Organization dropdown was always empty regardless of data.
 */
export async function searchVendorOrganisations(
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<VendorOrganisation[]> {
  const data = await postSearch<{ organisations?: RawOrganisation[] }>(
    "/vendor/organisation/v1/_search",
    "SearchCriteria",
    { tenantId, orgType: VENDOR_ORG_TYPE, orgStatus: ACTIVE_ORG_STATUS },
    { accessToken, user, limit: BULK_PAGE_SIZE },
  );

  return (data.organisations ?? []).map((org) => ({ code: org.id, name: org.name ?? org.id }));
}

/**
 * `POST /vendor/organisation/v1/user/_search` — no filter fields exist beyond `organizationId`, so
 * the role filter is applied here: only Field Staff (`INSTALLATION_REPORT_PART_A_EDITOR`, read from
 * the HRMS-enriched `user.roles`) are returned. field-planner-activity re-checks the role on submit
 * (`VENDOR_NOT_FIELD_STAFF`), so this is the dropdown's view of the same rule. Omitting
 * `RequestInfo.userInfo.type` causes an opaque 400 NPE (vendor-registry forwards to HRMS for
 * enrichment) — `createRequestInfo` always includes it when `user` is passed.
 */
export async function searchVendorOrgUsers(
  tenantId: string,
  organizationId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<VendorOrgUser[]> {
  const data = await postSearch<{ OrgUsers?: RawOrgUser[] }>(
    "/vendor/organisation/v1/user/_search",
    "OrgUser",
    { tenantId, organizationIds: [organizationId] },
    { accessToken, user, limit: BULK_PAGE_SIZE },
  );

  return (data.OrgUsers ?? [])
    .filter((orgUser) => orgUser.userId || orgUser.id)
    .filter((orgUser) => orgUser.user?.roles?.some((role) => role.code === FIELD_STAFF_ROLE))
    .map((orgUser) => ({
      code: (orgUser.userId ?? orgUser.id)!,
      // name/email aren't top-level on OrgUser -- they're on the nested HRMS-enriched `user`
      // object. Reading them at the top level always missed, so the dropdown fell back to
      // showing the raw uuid as the name and left email permanently blank.
      name: orgUser.user?.name ?? (orgUser.userId ?? orgUser.id)!,
      email: orgUser.user?.emailId,
    }));
}
