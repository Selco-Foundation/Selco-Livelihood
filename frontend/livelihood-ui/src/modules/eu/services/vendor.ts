import { postSearch, type AuthUser } from "@/shared";

const VENDOR_ROLES = ["LIVELIHOOD_VENDOR", "COMPLAINT_RESOLVER"];

export interface VendorUserOption {
  code: string;
  name: string;
}

interface RawOrgUserRole {
  code?: string;
}

interface RawOrgUser {
  id?: string;
  userId?: string;
  user?: { uuid?: string; name?: string; roles?: RawOrgUserRole[] };
}

export interface VendorOrgUsersPage {
  options: VendorUserOption[];
  total: number;
  /** Raw row count this page actually returned, before the client-side role filter — the
   * caller's pagination offset math must advance by this, not by `options.length`, or the next
   * request re-reads rows the backend already returned once a page has any non-vendor rows
   * filtered out of it. */
  rawCount: number;
}

/**
 * `POST /vendor/organisation/v1/user/_search` — real offset/limit pagination exists here
 * (`OrganisationUserQueryBuilder`'s `DENSE_RANK()`-based wrapper, and the response's
 * `TotalCount`), but `OrgUserSearchCriteria` has no `name`/text filter and no `roles` field at
 * all — the `roles` sent below is accepted (unknown JSON fields don't fail deserialization) but
 * confirmed to do nothing server-side, so every org user comes back regardless of role and the
 * vendor/resolver role check happens client-side instead. A user's name lives on the nested,
 * HRMS-enriched `user` object, not top-level on the org-user row itself (same gotcha already
 * documented by `pm`'s `searchVendorOrgUsers`).
 */
export async function searchVendorOrgUsers(
  organizationId: string,
  tenantId: string,
  limit: number,
  offset: number,
  accessToken: string,
  user?: AuthUser | null,
): Promise<VendorOrgUsersPage> {
  const data = await postSearch<{ OrgUsers?: RawOrgUser[]; TotalCount?: number }>(
    "/vendor/organisation/v1/user/_search",
    "OrgUser",
    { tenantId, organizationIds: [organizationId], roles: VENDOR_ROLES },
    { accessToken, user, limit, offset },
  );

  const rawRows = data.OrgUsers ?? [];
  const options = rawRows
    .filter((row) => row.user?.uuid && row.user.roles?.some((role) => VENDOR_ROLES.includes(role.code ?? "")))
    .map((row) => ({ code: row.user!.uuid!, name: row.user!.name ?? row.user!.uuid! }));

  return { options, total: data.TotalCount ?? rawRows.length, rawCount: rawRows.length };
}
