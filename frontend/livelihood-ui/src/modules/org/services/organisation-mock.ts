import type { organisationApi } from "./organisation-api";
import type {
  CreateOrganisationInput,
  CreateOrgUserInput,
  Organisation,
  OrganisationPage,
  OrganisationSearchParams,
  OrgJurisdiction,
  OrgRoleCatalog,
  OrgUser,
  UpdateOrganisationInput,
  UpdateOrgUserInput,
} from "../types/organisation";

/**
 * In-memory stand-in for vendor-registry, with the same function signatures as
 * `organisation-api.ts`. It also does what the backend is expected to do once
 * its tasks land: auto-creating the PoC user on org create, rejecting a phone
 * already active in another org, and blocking delete for a user with assigned
 * activities. Data resets on page reload.
 */

const LATENCY_MS = 400;

/** Mirrors the `Organisation.OrgRoles` / `OrgRoleGroups` MDMS masters as the PRD defines them. */
const ROLE_CATALOG: OrgRoleCatalog = {
  roles: [
    { code: "ORG_ADMIN", name: "Organisation POC", orgType: "PLATFORM" },
    { code: "LIVELIHOOD_POC", name: "Program POC", orgType: "PLATFORM" },
    { code: "INSTALLATION_REPORT_APPROVER_QC_TEAM", name: "Installation Reviewer", orgType: "PLATFORM" },
    { code: "AMC_REVIEWER", name: "AMC Reviewer", orgType: "PLATFORM" },
    { code: "PROJECT_MANAGER", name: "Project Manager", orgType: "PLATFORM" },
    { code: "END_USER_ADMIN", name: "End User Admin", orgType: "PLATFORM" },
    { code: "VENDOR_POC", name: "Vendor POC", orgType: "VENDOR" },
    { code: "FIELD_STAFF", name: "Field Staff", orgType: "VENDOR" },
    { code: "AMC_FIELD_STAFF", name: "AMC Field Staff", orgType: "VENDOR" },
  ],
  groups: [
    { name: "Organisation POC", orgType: "PLATFORM", roleCodes: ["ORG_ADMIN"] },
    { name: "Program POC", orgType: "PLATFORM", roleCodes: ["LIVELIHOOD_POC"] },
    { name: "Installation Reviewer", orgType: "PLATFORM", roleCodes: ["INSTALLATION_REPORT_APPROVER_QC_TEAM"] },
    { name: "AMC Reviewer", orgType: "PLATFORM", roleCodes: ["AMC_REVIEWER"] },
    { name: "Project Manager", orgType: "PLATFORM", roleCodes: ["PROJECT_MANAGER"] },
    { name: "End User Admin", orgType: "PLATFORM", roleCodes: ["END_USER_ADMIN"] },
    { name: "Vendor POC", orgType: "VENDOR", roleCodes: ["VENDOR_POC"] },
    { name: "Field Staff", orgType: "VENDOR", roleCodes: ["FIELD_STAFF"] },
    { name: "AMC Field Staff", orgType: "VENDOR", roleCodes: ["AMC_FIELD_STAFF"] },
  ],
};

const POC_ROLE_BY_TYPE = { PLATFORM: "ORG_ADMIN", VENDOR: "VENDOR_POC" } as const;

interface MockOrgUser extends OrgUser {
  isDeleted: boolean;
  hasAssignments?: boolean;
}

let sequence = 1006;
// Declared before the seed data below, which calls jurisdiction() while the module loads.
let jurisdictionSequence = 0;

let organisations: Organisation[] = [
  org("org-1", "IN-1001", "SELCO Foundation", "PLATFORM", "ACTIVE", "Ananya Rao", "9845012345", "ananya@selco.org", "ananya.rao"),
  org("org-2", "IN-1002", "Karnataka Programme Team", "PLATFORM", "ACTIVE", "Ravi Kumar", "9845012346", "", "ravi.kumar"),
  org("org-3", "IN-1003", "Sunrise Solar Pvt Ltd", "VENDOR", "ACTIVE", "Meena Shetty", "9845012347", "meena@sunrise.in", "meena.shetty"),
  org("org-4", "IN-1004", "GreenTech Installations", "VENDOR", "ACTIVE", "Arjun Naik", "9845012348", "", "arjun.naik"),
  org("org-5", "IN-1005", "Kaveri Agro Machines", "VENDOR", "INACTIVE", "Lakshmi Gowda", "9845012349", "", "lakshmi.gowda"),
];

let users: MockOrgUser[] = [
  user("org-1", "Ananya Rao", "ananya.rao", "9845012345", "ananya@selco.org", ["ORG_ADMIN"]),
  {
    ...user("org-1", "Kiran Hegde", "kiran.hegde", "9845100001", "kiran@selco.org", ["LIVELIHOOD_POC"]),
    jurisdictions: [jurisdiction("India_Karnataka", "State")],
  },
  user("org-1", "Divya Patil", "divya.patil", "9845100002", "", ["INSTALLATION_REPORT_APPROVER_QC_TEAM", "AMC_REVIEWER"]),
  user("org-2", "Ravi Kumar", "ravi.kumar", "9845012346", "", ["ORG_ADMIN"]),
  user("org-2", "Sneha Iyer", "sneha.iyer", "9845100003", "sneha@kpt.org", ["PROJECT_MANAGER"]),
  user("org-3", "Meena Shetty", "meena.shetty", "9845012347", "meena@sunrise.in", ["VENDOR_POC"]),
  {
    ...user("org-3", "Suresh Gowda", "suresh.gowda", "9845100004", "", ["FIELD_STAFF"]),
    jurisdictions: [
      jurisdiction("India_Karnataka_Udupi", "District"),
      jurisdiction("India_Karnataka_Dakshina Kannada_Bantwal", "Block"),
    ],
    hasAssignments: true,
  },
  user("org-3", "Prakash M", "prakash.m", "9845100005", "", ["AMC_FIELD_STAFF"]),
  user("org-4", "Arjun Naik", "arjun.naik", "9845012348", "", ["VENDOR_POC"]),
  user("org-5", "Lakshmi Gowda", "lakshmi.gowda", "9845012349", "", ["VENDOR_POC"]),
];

function org(
  id: string,
  code: string,
  name: string,
  orgType: Organisation["orgType"],
  status: string,
  pocName: string,
  pocPhone: string,
  pocEmail: string,
  pocUsername: string,
): Organisation {
  return { id, code, name, orgType, status, pocName, pocPhone, pocEmail: pocEmail || undefined, pocUsername };
}

function user(
  organisationId: string,
  name: string,
  userName: string,
  mobileNumber: string,
  emailId: string,
  roleCodes: string[],
): MockOrgUser {
  const id = `${organisationId}-${userName}`;
  return {
    orgUserId: `ou-${id}`,
    userId: `uuid-${id}`,
    organisationId,
    name,
    userName,
    mobileNumber,
    emailId: emailId || undefined,
    roleCodes,
    jurisdictions: [],
    isDeleted: false,
  };
}


/** A saved, active jurisdiction — gets an id the way HRMS gives one. */
function jurisdiction(boundary: string, boundaryType: OrgJurisdiction["boundaryType"]): OrgJurisdiction {
  jurisdictionSequence += 1;
  return {
    id: `jur-${jurisdictionSequence}`,
    hierarchy: "SELCO",
    boundary,
    boundaryType,
    tenantId: "livelihood",
    isActive: true,
  };
}

/** What HRMS does on save: new jurisdictions get an id; existing ones keep theirs. */
function withIds(items: OrgJurisdiction[]): OrgJurisdiction[] {
  return items.map((item) => (item.id ? item : jurisdiction(item.boundary, item.boundaryType)));
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY_MS));
}

/** Shaped like an axios error so `extractApiErrorMessage` reads it exactly like a real backend error. */
function apiError(message: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject({ response: { data: { Errors: [{ message }] } } }), LATENCY_MS),
  );
}

function activeUsers() {
  return users.filter((item) => !item.isDeleted);
}

function stripMockFields(item: MockOrgUser): OrgUser {
  const { isDeleted: _isDeleted, hasAssignments: _hasAssignments, ...rest } = item;
  return rest;
}

async function searchOrganisations(params: OrganisationSearchParams): Promise<OrganisationPage> {
  const query = params.name?.trim().toLowerCase() ?? "";
  const matches = organisations.filter(
    (item) => item.orgType === params.orgType && (!query || item.name.toLowerCase().includes(query)),
  );
  return delay({
    organisations: matches.slice(params.offset, params.offset + params.limit),
    total: matches.length,
  });
}

async function getOrganisation(id: string): Promise<Organisation | null> {
  return delay(organisations.find((item) => item.id === id) ?? null);
}

async function createOrganisation(input: CreateOrganisationInput): Promise<Organisation> {
  const phone = input.pocPhone.trim();
  const username = input.pocUsername.trim();
  if (activeUsers().some((item) => item.mobileNumber === phone)) {
    return apiError("This user already belong to another org");
  }
  if (activeUsers().some((item) => item.userName === username)) {
    return apiError(`This user with this username already exist: ${username}`);
  }

  sequence += 1;
  const created: Organisation = {
    id: `org-${sequence}`,
    code: `IN-${sequence}`,
    name: input.name.trim(),
    orgType: input.orgType,
    status: input.status,
    pocName: input.pocName.trim(),
    pocPhone: phone,
    pocEmail: input.pocEmail?.trim() || undefined,
    pocUsername: username,
  };
  organisations = [created, ...organisations];
  // What the backend will do on org create: the PoC becomes a user with the POC role.
  users = [
    ...users,
    user(created.id, created.pocName ?? "", username, phone, created.pocEmail ?? "", [
      POC_ROLE_BY_TYPE[input.orgType],
    ]),
  ];
  return delay(created);
}

async function updateOrganisation(
  organisation: Organisation,
  input: UpdateOrganisationInput,
): Promise<Organisation> {
  const updated: Organisation = {
    ...organisation,
    name: input.name.trim(),
    status: input.status,
    pocName: input.pocName.trim(),
    pocPhone: input.pocPhone.trim(),
    pocEmail: input.pocEmail?.trim() || undefined,
  };
  organisations = organisations.map((item) => (item.id === organisation.id ? updated : item));
  return delay(updated);
}

async function searchOrgUsers(organisationId: string): Promise<OrgUser[]> {
  return delay(
    activeUsers()
      .filter((item) => item.organisationId === organisationId)
      .map(stripMockFields),
  );
}

async function findOrganisationIdForUser(userUuid: string): Promise<string | null> {
  const match = activeUsers().find((item) => item.userId === userUuid);
  // Mock mode: a logged-in user who isn't in the seed data lands on the first vendor org.
  return delay(match?.organisationId ?? "org-3");
}

async function createOrgUser(input: CreateOrgUserInput): Promise<void> {
  const phone = input.mobileNumber.trim();
  const username = input.userName.trim();
  const phoneOwner = activeUsers().find((item) => item.mobileNumber === phone);
  if (phoneOwner && phoneOwner.organisationId !== input.organisationId) {
    return apiError("This user already belong to another org");
  }
  if (activeUsers().some((item) => item.userName === username)) {
    return apiError(`This user with this username already exist: ${username}`);
  }
  users = [
    ...users,
    {
      ...user(
        input.organisationId,
        input.name.trim(),
        username,
        phone,
        input.emailId?.trim() ?? "",
        input.roles.map((role) => role.code),
      ),
      jurisdictions: withIds(input.jurisdictions),
    },
  ];
  return delay(undefined);
}

async function updateOrgUser(input: UpdateOrgUserInput): Promise<void> {
  const phone = input.mobileNumber.trim();
  const phoneOwner = activeUsers().find(
    (item) => item.mobileNumber === phone && item.orgUserId !== input.user.orgUserId,
  );
  if (phoneOwner) {
    return apiError("This user already belong to another org");
  }
  users = users.map((item) =>
    item.orgUserId === input.user.orgUserId
      ? {
          ...item,
          name: input.name.trim(),
          mobileNumber: phone,
          emailId: input.emailId?.trim() || undefined,
          roleCodes: input.roles.map((role) => role.code),
          jurisdictions: withIds(input.jurisdictions),
        }
      : item,
  );
  return delay(undefined);
}

async function deleteOrgUser(target: OrgUser): Promise<void> {
  const existing = users.find((item) => item.orgUserId === target.orgUserId);
  if (existing?.hasAssignments) {
    return apiError("User cannot be deleted because they have active or pending assignments.");
  }
  users = users.map((item) => (item.orgUserId === target.orgUserId ? { ...item, isDeleted: true } : item));
  return delay(undefined);
}

async function fetchRoleCatalog(): Promise<OrgRoleCatalog> {
  return delay(ROLE_CATALOG);
}

export const organisationMockApi: typeof organisationApi = {
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
