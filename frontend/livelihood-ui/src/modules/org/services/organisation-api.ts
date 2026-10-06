import { apiClient, fetchMdmsMasters, tenantId } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type {
  CreateOrganisationInput,
  CreateOrgUserInput,
  Organisation,
  OrganisationPage,
  OrganisationSearchParams,
  OrgApiContext,
  OrgJurisdiction,
  OrgRole,
  OrgRoleCatalog,
  OrgRoleGroup,
  OrgType,
  OrgUser,
  UpdateOrganisationInput,
  UpdateOrgUserInput,
} from "../types/organisation";

/**
 * vendor-registry client (`/vendor/organisation/v1/...`). Not used while
 * `ORG_USE_MOCK_API` is on — written against the contract the E4H Management
 * Hub uses, and still needs verifying end to end once the backend tasks land:
 *  - PoC password on org create and user password on user create/update are
 *    sent but ignored by the backend until those tasks ship.
 *  - Org search returns `orgPocPhone` encrypted until the backend fixes it.
 *  - Paging must go in the `Pagination` body key — the backend ignores the
 *    `limit`/`offset` query params the E4H UI sends.
 */
export const organisationApi = {
  searchOrganisations,
  getOrganisation,
  createOrganisation,
  updateOrganisation,
  searchOrgUsers,
  findOrganisationIdForUser,
  createOrgUser,
  updateOrgUser,
  deleteOrgUser,
  fetchRoleCatalog,
};

const ORG_BASE = "/vendor/organisation/v1";

interface OrganisationRecord {
  id?: string;
  code?: string;
  name?: string;
  orgType?: string;
  orgStatus?: string;
  orgPocName?: string;
  orgPocPhone?: string;
  orgPocEmail?: string;
  orgPocUsername?: string;
}

interface OrganisationResponse {
  organisations?: OrganisationRecord[];
  TotalCount?: number;
}

interface OrgUserRecord {
  id?: string;
  userId?: string;
  organizationId?: string;
  user?: {
    uuid?: string;
    name?: string;
    userName?: string;
    mobileNumber?: string;
    emailId?: string;
    roles?: Array<{ code?: string; name?: string }>;
    jurisdiction?: Array<Partial<OrgJurisdiction>>;
  };
}

interface OrgUserResponse {
  OrgUsers?: OrgUserRecord[];
  TotalCount?: number;
}

function toOrganisation(record: OrganisationRecord): Organisation {
  return {
    id: record.id ?? "",
    code: record.code,
    name: record.name ?? "",
    orgType: (record.orgType as OrgType) ?? "PLATFORM",
    status: record.orgStatus ?? "ACTIVE",
    pocName: record.orgPocName,
    pocPhone: record.orgPocPhone,
    pocEmail: record.orgPocEmail,
    pocUsername: record.orgPocUsername,
    raw: record as Record<string, unknown>,
  };
}

function toJurisdiction(item: Partial<OrgJurisdiction>): OrgJurisdiction {
  return {
    id: item.id,
    hierarchy: item.hierarchy ?? "SELCO",
    boundary: item.boundary ?? "",
    boundaryType: item.boundaryType ?? "Country",
    tenantId: item.tenantId ?? tenantId(),
    isActive: item.isActive ?? true,
  };
}

function toOrgUser(record: OrgUserRecord): OrgUser {
  return {
    orgUserId: record.id ?? "",
    userId: record.userId ?? record.user?.uuid ?? "",
    organisationId: record.organizationId ?? "",
    name: record.user?.name ?? "",
    userName: record.user?.userName ?? "",
    mobileNumber: record.user?.mobileNumber ?? "",
    emailId: record.user?.emailId,
    roleCodes: (record.user?.roles ?? []).map((role) => role.code ?? "").filter(Boolean),
    jurisdictions: (record.user?.jurisdiction ?? []).map(toJurisdiction),
    raw: (record.user ?? {}) as Record<string, unknown>,
  };
}

async function searchOrganisations(
  params: OrganisationSearchParams,
  ctx: OrgApiContext,
): Promise<OrganisationPage> {
  const { data } = await apiClient.post<OrganisationResponse>(`${ORG_BASE}/_search`, {
    RequestInfo: createRequestInfo(ctx.accessToken, ctx.user),
    SearchCriteria: {
      tenantId: tenantId(),
      orgType: params.orgType,
      ...(params.name?.trim() ? { name: params.name.trim() } : {}),
    },
    Pagination: { limit: params.limit, offset: params.offset },
  });

  const organisations = data.organisations?.map(toOrganisation) ?? [];
  return { organisations, total: data.TotalCount ?? organisations.length };
}

async function getOrganisation(id: string, ctx: OrgApiContext): Promise<Organisation | null> {
  const { data } = await apiClient.post<OrganisationResponse>(`${ORG_BASE}/_search`, {
    RequestInfo: createRequestInfo(ctx.accessToken, ctx.user),
    SearchCriteria: { tenantId: tenantId(), id },
  });
  const record = data.organisations?.[0];
  return record ? toOrganisation(record) : null;
}

async function createOrganisation(
  input: CreateOrganisationInput,
  ctx: OrgApiContext,
): Promise<Organisation> {
  const { data } = await apiClient.post<OrganisationResponse>(`${ORG_BASE}/_create`, {
    RequestInfo: createRequestInfo(ctx.accessToken, ctx.user),
    organisations: [
      {
        tenantId: tenantId(),
        name: input.name.trim(),
        orgType: input.orgType,
        orgStatus: input.status,
        orgPocName: input.pocName.trim(),
        orgPocPhone: input.pocPhone.trim(),
        ...(input.pocEmail?.trim() ? { orgPocEmail: input.pocEmail.trim() } : {}),
        orgPocUsername: input.pocUsername.trim(),
        orgPocPassword: input.pocPassword,
        isActive: true,
        orgAddress: [],
      },
    ],
  });
  return toOrganisation(data.organisations?.[0] ?? {});
}

async function updateOrganisation(
  organisation: Organisation,
  input: UpdateOrganisationInput,
  ctx: OrgApiContext,
): Promise<Organisation> {
  const { data } = await apiClient.post<OrganisationResponse>(`${ORG_BASE}/_update`, {
    RequestInfo: createRequestInfo(ctx.accessToken, ctx.user),
    organisations: [
      {
        ...organisation.raw,
        name: input.name.trim(),
        orgStatus: input.status,
        orgPocName: input.pocName.trim(),
        orgPocPhone: input.pocPhone.trim(),
        orgPocEmail: input.pocEmail?.trim() || undefined,
        isActive: true,
        orgAddress: [],
      },
    ],
  });
  return toOrganisation(data.organisations?.[0] ?? {});
}

async function searchOrgUsersBy(
  criteria: { organizationIds?: string[]; userIds?: string[] },
  limit: number,
  ctx: OrgApiContext,
): Promise<OrgUserRecord[]> {
  const tenant = tenantId();
  const { data } = await apiClient.post<OrgUserResponse>(
    `${ORG_BASE}/user/_search`,
    {
      RequestInfo: createRequestInfo(ctx.accessToken, ctx.user),
      OrgUser: { tenantId: tenant, ...criteria },
    },
    // The URL tenantId must match OrgUser.tenantId.
    { params: { tenantId: tenant, limit, offset: 0, includeDeleted: false } },
  );
  return data.OrgUsers ?? [];
}

async function searchOrgUsers(organisationId: string, ctx: OrgApiContext): Promise<OrgUser[]> {
  const records = await searchOrgUsersBy({ organizationIds: [organisationId] }, 100, ctx);
  return records.map(toOrgUser);
}

async function findOrganisationIdForUser(userUuid: string, ctx: OrgApiContext): Promise<string | null> {
  const records = await searchOrgUsersBy({ userIds: [userUuid] }, 1, ctx);
  return records[0]?.organizationId ?? null;
}

function toRolePayload(roles: CreateOrgUserInput["roles"]) {
  const tenant = tenantId();
  return roles.map((role) => ({ code: role.code, name: role.name, tenantId: tenant }));
}

async function createOrgUser(input: CreateOrgUserInput, ctx: OrgApiContext): Promise<void> {
  await apiClient.post(`${ORG_BASE}/user/_create`, {
    RequestInfo: createRequestInfo(ctx.accessToken, ctx.user),
    organizationId: input.organisationId,
    user: {
      tenantId: tenantId(),
      name: input.name.trim(),
      userName: input.userName.trim(),
      password: input.password,
      mobileNumber: input.mobileNumber.trim(),
      ...(input.emailId?.trim() ? { emailId: input.emailId.trim() } : {}),
      roles: toRolePayload(input.roles),
      // vendor-registry's user key is singular `jurisdiction`.
      jurisdiction: input.jurisdictions,
    },
  });
}

async function updateOrgUser(input: UpdateOrgUserInput, ctx: OrgApiContext): Promise<void> {
  await apiClient.post(`${ORG_BASE}/user/_update`, {
    RequestInfo: createRequestInfo(ctx.accessToken, ctx.user),
    id: input.user.orgUserId,
    organizationId: input.user.organisationId,
    user: {
      ...input.user.raw,
      tenantId: tenantId(),
      name: input.name.trim(),
      mobileNumber: input.mobileNumber.trim(),
      emailId: input.emailId?.trim() || undefined,
      roles: toRolePayload(input.roles),
      // Existing jurisdictions merged with new ones; removed ones go back with isActive: false.
      jurisdiction: input.jurisdictions,
      ...(input.newPassword ? { password: input.newPassword } : {}),
    },
  });
}

async function deleteOrgUser(user: OrgUser, ctx: OrgApiContext): Promise<void> {
  await apiClient.post(`${ORG_BASE}/user/_delete`, {
    RequestInfo: createRequestInfo(ctx.accessToken, ctx.user),
    id: user.orgUserId,
    userId: user.userId,
    organizationId: user.organisationId,
  });
}

async function fetchRoleCatalog(ctx: OrgApiContext): Promise<OrgRoleCatalog> {
  const masters = await fetchMdmsMasters(
    tenantId(),
    "Organisation",
    ["OrgRoles", "OrgRoleGroups"],
    ctx.accessToken,
    ctx.user,
  );
  return {
    roles: (masters.OrgRoles as OrgRole[] | undefined) ?? [],
    groups: (masters.OrgRoleGroups as OrgRoleGroup[] | undefined) ?? [],
  };
}
