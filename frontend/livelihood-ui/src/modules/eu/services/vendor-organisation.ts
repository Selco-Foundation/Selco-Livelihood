import { postSearch, type AuthUser } from "@/shared";

export interface VendorOrganisationOption {
  code: string;
  name: string;
}

interface RawOrganisation {
  id?: string;
  name?: string;
  orgStatus?: string;
}

/**
 * `POST /vendor/organisation/v1/_search` — the response's organisation list is the lowercase
 * `organisations` key, not `Organisations` (confirmed live by `pm`'s already-proven
 * `searchVendorOrganisations`). Real server-side `name` search exists (confirmed in
 * `OrganisationFunctionQueryBuilder`'s `LOWER(org.name) LIKE ...`), but the endpoint doesn't
 * paginate at all — `offset`/`limit` are accepted in the URL but never read by the controller or
 * service, so this always returns every org matching the given query in one response.
 */
export async function searchVendorOrganisations(
  query: string | undefined,
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<VendorOrganisationOption[]> {
  const data = await postSearch<{ organisations?: RawOrganisation[] }>(
    "/vendor/organisation/v1/_search",
    "SearchCriteria",
    { tenantId, orgType: "VENDOR", ...(query ? { name: query } : {}) },
    { accessToken, user, limit: 50 },
  );

  return (data.organisations ?? [])
    .filter((org) => org.id && org.orgStatus === "ACTIVE")
    .map((org) => ({ code: org.id!, name: org.name ?? org.id! }));
}
