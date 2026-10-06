import type { AuthUser } from "@/shared";

export type OrgType = "PLATFORM" | "VENDOR";

export type OrgStatus = "ACTIVE" | "INACTIVE";

export const ORG_STATUSES: OrgStatus[] = ["ACTIVE", "INACTIVE"];

export interface Organisation {
  id: string;
  /** System-generated organisation code. */
  code?: string;
  name: string;
  orgType: OrgType;
  status: string;
  pocName?: string;
  pocPhone?: string;
  pocEmail?: string;
  pocUsername?: string;
  /** Untransformed backend record — spread back into the update payload so unedited fields survive. */
  raw?: Record<string, unknown>;
}

export interface OrganisationSearchParams {
  orgType: OrgType;
  name?: string;
  limit: number;
  offset: number;
}

export interface OrganisationPage {
  organisations: Organisation[];
  total: number;
}

export interface CreateOrganisationInput {
  orgType: OrgType;
  name: string;
  status: OrgStatus;
  pocName: string;
  pocPhone: string;
  pocEmail?: string;
  pocUsername: string;
  pocPassword: string;
}

export interface UpdateOrganisationInput {
  name: string;
  status: string;
  pocName: string;
  pocPhone: string;
  pocEmail?: string;
}

/** An `Organisation.OrgRoles` MDMS entry. */
export interface OrgRole {
  code: string;
  name: string;
  orgType: OrgType;
}

/**
 * An `Organisation.OrgRoleGroups` MDMS entry — what the role dropdown shows.
 * Selecting a group assigns every role in `roleCodes`. Groups have no code of
 * their own in MDMS, so `name` doubles as the identifier.
 */
export interface OrgRoleGroup {
  name: string;
  orgType: OrgType;
  roleCodes: string[];
}

export interface OrgRoleCatalog {
  roles: OrgRole[];
  groups: OrgRoleGroup[];
}

export type JurisdictionBoundaryType = "Country" | "State" | "District" | "Block" | "Facility";

/**
 * One user jurisdiction (stored on the HRMS employee): the boundary the user works in.
 * The deepest level picked is what's saved. Removing an existing jurisdiction
 * keeps the row and sends it back with `isActive: false`, same as E4H.
 */
export interface OrgJurisdiction {
  /** Present for jurisdictions already saved on the user. */
  id?: string;
  hierarchy: string;
  boundary: string;
  boundaryType: JurisdictionBoundaryType;
  tenantId: string;
  isActive: boolean;
}

export interface OrgUser {
  /** The org-user link id (`eg_org_user.id`) — what update/delete address. */
  orgUserId: string;
  /** The egov-user uuid. */
  userId: string;
  organisationId: string;
  name: string;
  userName: string;
  mobileNumber: string;
  emailId?: string;
  roleCodes: string[];
  /** Active and inactive jurisdictions as stored on the HRMS employee. */
  jurisdictions: OrgJurisdiction[];
  /** Untransformed HRMS user — spread back into the update payload. */
  raw?: Record<string, unknown>;
}

export interface CreateOrgUserInput {
  organisationId: string;
  name: string;
  userName: string;
  password: string;
  mobileNumber: string;
  emailId?: string;
  roles: Array<Pick<OrgRole, "code" | "name">>;
  /** Empty = no jurisdiction; the backend then defaults the user to the whole country. */
  jurisdictions: OrgJurisdiction[];
}

export interface UpdateOrgUserInput {
  user: OrgUser;
  name: string;
  mobileNumber: string;
  emailId?: string;
  roles: Array<Pick<OrgRole, "code" | "name">>;
  /** Full list: existing jurisdictions (some possibly deactivated) followed by new ones. */
  jurisdictions: OrgJurisdiction[];
  /** Blank/absent leaves the password unchanged. */
  newPassword?: string;
}

/** Auth context every service call needs to build `RequestInfo`. */
export interface OrgApiContext {
  accessToken: string;
  user: AuthUser | null;
}
