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
  siteId: string;
  solutionCode: string;
  vendorOrgCode?: string;
  vendorUserCode?: string;
  vendorEmail?: string;
}

export interface InstallationPlanAdditionalDetails {
  sectorCode?: string;
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
