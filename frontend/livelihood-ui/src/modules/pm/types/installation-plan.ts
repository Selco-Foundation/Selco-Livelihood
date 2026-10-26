import type { GeographyDetails } from "./project";

export interface InstallationPlanScopeEntry {
  siteId: string;
  included: boolean;
  solutionCode?: string;
  /** Set once the scope sheet has been confirmed via `createScopeFromSheet` — mirrors
   *  the real service's `Lock Status` column (informational; sites already tied to a
   *  published plan report as locked). */
  lockStatus?: "LOCKED" | "UNLOCKED";
  /** Set once the scope sheet has been confirmed — mirrors the real service's
   *  `Field Plan Linking Status` column appended to the create-response workbook. */
  linkStatus?: "Linked" | "Already Linked" | "Unlinked";
}

export interface InstallationPlanTemplateEntry {
  solutionCode: string;
  uploaded: boolean;
}

export interface InstallationPlanAssignmentEntry {
  facilityId: string;
  componentType: "SOLAR" | "MACHINE";
  componentSequence: number;
  vendorOrgId?: string;
  vendorOrgName?: string;
  vendorUserId?: string;
  vendorUserName?: string;
  vendorEmail?: string;
}

export interface InstallationPlanAdditionalDetails {
  sectorCodes?: string[];
  reviewerCode?: string;
  scope?: InstallationPlanScopeEntry[];
  templates?: InstallationPlanTemplateEntry[];
  assignments?: InstallationPlanAssignmentEntry[];
  /** Undefined/missing means "draft" — a plan only becomes "PUBLISHED" once
   *  Technician Assignment is confirmed and submitted. */
  status?: string;
  [key: string]: unknown;
}

export interface InstallationPlan {
  id?: string;
  tenantId: string;
  projectId: string;
  /** The plan code, e.g. "KA-INS-2026-001" — generated on creation. */
  name?: string;
  /** Must be a subset of the parent project's geography. */
  geographyDetails?: GeographyDetails;
  startDate?: number;
  endDate?: number;
  additionalDetails?: InstallationPlanAdditionalDetails;
}

export interface InstallationPlanSearchCriteria {
  id?: string[];
  projectId?: string;
}

export interface InstallationPlanStatusWrapper {
  plan: InstallationPlan;
  status?: string;
}

export interface InstallationPlanSearchResult {
  plans: InstallationPlanStatusWrapper[];
  totalCount: number;
}

/** One plan holding a geography code, as `field-plans/geography/_locks` reports it. */
export interface GeographyLockUsage {
  fieldPlanId: string;
  fieldPlanName?: string;
  /** Set for a plan's own lock: how many of its scoped sites sit under the code. */
  siteCount?: number;
}

/** A geography code that cannot be removed, and what holds it. */
export interface GeographyLock {
  code: string;
  usedBy: GeographyLockUsage[];
}

/** Whose geography to check: a project's (codes its plans use) or a plan's (codes holding a
 *  scoped end-user site). */
export type GeographyLockTarget = { projectId: string } | { fieldPlanId: string };

/** The raw `field-plans/geography/_locks` response. `SectorLocks` is filled for a plan only: its
 *  sectors that hold a scoped end-user site, by the sector name as stored on the plan. */
export interface GeographyLocksResponse {
  GeographyLocks?: GeographyLock[];
  SectorLocks?: GeographyLock[];
}

/** A plan's reviewer assignment row, as `activities/assignment/_search` returns it. Only the fields
 *  read here are typed; the rest is carried through untouched when the row is sent back on update. */
export interface ReviewerAssignment {
  id?: string;
  tenantId?: string;
  fieldPlanId?: string;
  assignedTo?: string;
  isDeleted?: boolean;
  [field: string]: unknown;
}
