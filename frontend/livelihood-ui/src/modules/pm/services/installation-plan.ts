import { apiClient } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { AuthUser } from "@/shared/stores/auth-store";
import type { GeographyDetails } from "../types/project";
import type {
  InstallationPlan,
  InstallationPlanSearchCriteria,
  InstallationPlanSearchResult,
} from "../types/installation-plan";
import { resolveStates } from "../utils/geography";

const INSTALLATION_ACTIVITY_CODE = "INS";
const INSTALLATION_REVIEWER_ROLE = "INSTALLATION_REPORT_APPROVER_QC_TEAM";

/** `field-planner`'s `geographyDetails` is flat (`{states: string[], districts: string[],
 *  blocks: string[]}`), matching the project's own structured, multi-state shape in cardinality
 *  now that the backend accepts more than one state per plan. */
function toFieldPlanGeography(geography: GeographyDetails) {
  return {
    states: resolveStates(geography).map((state) => state.code),
    districts: (geography.districts ?? []).map((district) => district.code),
    blocks: (geography.blocks ?? []).map((block) => block.code),
  };
}

/** Best-effort reverse mapping for display once a plan is read back — lossy (which state a given
 *  district/block belongs to can't be recovered from the flat list once a plan spans more than
 *  one), but plan geography is read-only after creation so this only ever feeds a disabled view;
 *  `stateCode`/`districtCode` are left blank rather than guessed. */
function fromFieldPlanGeography(flat: { states?: string[]; districts?: string[]; blocks?: string[] }): GeographyDetails {
  return {
    states: (flat.states ?? []).map((code) => ({ code })),
    districts: (flat.districts ?? []).map((code) => ({ code, stateCode: "" })),
    blocks: (flat.blocks ?? []).map((code) => ({ code, districtCode: "", stateCode: "" })),
  };
}

interface RawFieldPlan {
  id?: string;
  tenantId: string;
  projectId: string;
  name?: string;
  sectors?: string[];
  healthFacilityNumber?: number;
  startDate?: number;
  endDate?: number;
  geographyDetails?: { states?: string[]; districts?: string[]; blocks?: string[] };
  status?: string;
}

function toInstallationPlan(raw: RawFieldPlan): InstallationPlan {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    projectId: raw.projectId,
    name: raw.name,
    startDate: raw.startDate,
    endDate: raw.endDate,
    geographyDetails: fromFieldPlanGeography(raw.geographyDetails ?? {}),
    additionalDetails: {
      sectorCodes: raw.sectors,
      status: raw.status,
    },
  };
}

/**
 * `POST /field-planner/v1/field-plans/_create` — writes synchronously (unlike `project`), so its
 * response is trustworthy without a follow-up poll.
 */
export async function createInstallationPlan(
  plan: InstallationPlan,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<InstallationPlan> {
  const { data } = await apiClient.post<{ FieldPlans?: RawFieldPlan[] }>(
    "/field-planner/v1/field-plans/_create",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      FieldPlans: [
        {
          tenantId: plan.tenantId,
          projectId: plan.projectId,
          sectors: plan.additionalDetails?.sectorCodes,
          // Not validated against the sites eventually in scope — descriptive only, per the
          // proven backend behavior.
          healthFacilityNumber: 1,
          startDate: plan.startDate,
          endDate: plan.endDate,
          geographyDetails: toFieldPlanGeography(plan.geographyDetails ?? {}),
          activities: [{ code: INSTALLATION_ACTIVITY_CODE, name: "Installation" }],
        },
      ],
    },
  );

  const created = data.FieldPlans?.[0];
  if (!created?.id) throw new Error("INSTALLATION_PLAN_CREATE_FAILED");

  if (plan.additionalDetails?.reviewerCode) {
    await assignInstallationReviewer(
      created.id,
      plan.additionalDetails.reviewerCode,
      plan.startDate,
      plan.endDate,
      accessToken,
      user,
    );
  }

  return toInstallationPlan(created);
}

/**
 * `POST /activity/v1/activities/_assign-activity` — the reviewer assignment made alongside plan
 * creation. `activityId` is matched as the string code `"INS"`, not a UUID, despite the field
 * name. The role code is genuinely `INSTALLATION_REPORT_APPROVER_QC_TEAM` (a proven trap — the
 * backend's own constant is misleadingly named after the screen wording).
 *
 * The assignment's own `startDate`/`endDate` must fall within the field plan's date range and be
 * at least a day apart (`INVALID_DATE`/`FIELDPLAN_ENDDATE` otherwise) — using `Date.now()` for
 * both was a proven trap (zero difference, and "now" can be later than a plan's own end date).
 * Falls back to `Date.now()`/`Date.now() + 1 day` only if the plan is somehow missing its own
 * dates (shouldn't happen — both are required by `isPlanDetailsValid`).
 */
export async function assignInstallationReviewer(
  fieldPlanId: string,
  reviewerUuid: string,
  planStartDate?: number,
  planEndDate?: number,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<void> {
  const startDate = planStartDate ?? Date.now();
  const endDate = planEndDate ?? startDate + 24 * 60 * 60 * 1000;

  await apiClient.post("/activity/v1/activities/_assign-activity", {
    RequestInfo: createRequestInfo(accessToken, user),
    ActivityAssignment: [
      {
        tenantId: user?.tenantId,
        fieldPlanId,
        activityId: INSTALLATION_ACTIVITY_CODE,
        activityCode: INSTALLATION_ACTIVITY_CODE,
        activityName: "Installation",
        assignedTo: reviewerUuid,
        assignedBy: user?.uuid,
        role: { code: INSTALLATION_REVIEWER_ROLE, name: "Installation Report Approver QC Team" },
        startDate,
        endDate,
        status: "ACTIVE",
        isDeleted: false,
        // No point-of-contact number is collected in the wizard today — needs a follow-up UI
        // field if the backend starts validating this instead of just storing it.
        pocNumber: "",
      },
    ],
  });
}

/**
 * `POST /activity/v1/activities/assignment/_search` — reads back the reviewer assigned to a plan.
 * The reviewer is never part of `field-planner`'s own `FieldPlan` response (it lives in this
 * service's `activity_assignments` table instead), so re-opening an existing plan needs this
 * separate call or the "Assign Installation Reviewer" field renders as unset even though a
 * reviewer was already assigned at creation. Body key is the singular `ActivityAssignment`
 * (search criteria, not a list) despite the same key naming the array on `_assign-activity`.
 * `tenantId`/`limit`/`offset` must also be query params — the endpoint binds them via
 * `@ModelAttribute URLParams`, so they 400 with `NotNull.URLParams.*` if only sent in the body.
 */
export async function searchAssignedReviewer(
  fieldPlanId: string,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<string | undefined> {
  const { data } = await apiClient.post<{ ActivityAssignment?: Array<{ assignedTo?: string; isDeleted?: boolean }> }>(
    "/activity/v1/activities/assignment/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      ActivityAssignment: {
        fieldPlanIds: [fieldPlanId],
        roles: [INSTALLATION_REVIEWER_ROLE],
        tenantId: user?.tenantId,
      },
    },
    { params: { tenantId: user?.tenantId, limit: 10, offset: 0 } },
  );

  return data.ActivityAssignment?.find((assignment) => !assignment.isDeleted && assignment.assignedTo)?.assignedTo;
}

/** `POST /field-planner/v1/field-plans/_update` */
export async function updateInstallationPlan(
  plan: InstallationPlan,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<InstallationPlan> {
  const { data } = await apiClient.post<{ FieldPlans?: RawFieldPlan[] }>(
    "/field-planner/v1/field-plans/_update",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      FieldPlans: [
        {
          id: plan.id,
          tenantId: plan.tenantId,
          projectId: plan.projectId,
          sectors: plan.additionalDetails?.sectorCodes,
          startDate: plan.startDate,
          endDate: plan.endDate,
          geographyDetails: toFieldPlanGeography(plan.geographyDetails ?? {}),
          // Required or `_update` 400s with `{"code":"ACTIVITIES","message":"Activity is
          // mandatory"}` — proven live. A plan only ever has the one fixed Installation
          // activity, the same value `_create` already sends.
          activities: [{ code: INSTALLATION_ACTIVITY_CODE, name: "Installation" }],
        },
      ],
    },
  );

  const updated = data.FieldPlans?.[0];
  return updated ? toInstallationPlan(updated) : plan;
}

/**
 * `POST /field-planner/v1/field-plans/_search` — `tenantId` must be inside the `FieldPlans` body,
 * not just the query string (a proven trap: query-string-only 400s with `TENANT_ID: Tenant ID is
 * mandatory`).
 */
export async function searchInstallationPlans(
  {
    criteria,
    limit = 10,
    offset = 0,
  }: {
    criteria?: InstallationPlanSearchCriteria;
    limit?: number;
    offset?: number;
  },
  accessToken?: string,
  user?: AuthUser | null,
): Promise<InstallationPlanSearchResult> {
  const { data } = await apiClient.post<{ FieldPlans?: RawFieldPlan[]; TotalCount?: number }>(
    "/field-planner/v1/field-plans/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      FieldPlans: {
        tenantId: user?.tenantId,
        ...(criteria?.id?.length ? { ids: criteria.id } : {}),
        ...(criteria?.projectId ? { projectIds: [criteria.projectId] } : {}),
      },
    },
    { params: { tenantId: user?.tenantId, limit, offset } },
  );

  const plans = (data.FieldPlans ?? []).map(toInstallationPlan);

  return {
    plans: plans.map((plan) => ({ plan, status: plan.additionalDetails?.status ?? "DRAFT" })),
    totalCount: data.TotalCount ?? plans.length,
  };
}

/**
 * `POST /activity/v1/vendor-assignment/_create` — the one-shot "Confirm & Submit" action on
 * Technician Assignment. Moves the plan out of "DRAFT" into "PUBLISHED"; **irreversible**, no
 * unpublish endpoint exists. `RequestInfo.userInfo.roles` must be the real roles list or this NPEs
 * deep in egov-workflow-v2. Give this call a generous timeout — the backend's internal
 * transition-polling can take a few seconds under its own retry/backoff.
 */
export async function publishInstallationPlan(
  planId: string,
  assignments: Array<{
    facilityId: string;
    componentType: "SOLAR" | "MACHINE";
    componentSequence: number;
    vendorOrgId?: string;
    vendorOrgName?: string;
    vendorUserId?: string;
  }>,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<InstallationPlan> {
  const { data } = await apiClient.post<{
    fieldPlanId?: string;
    planStatus?: string;
  }>(
    "/activity/v1/vendor-assignment/_create",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      VendorAssignment: { tenantId: user?.tenantId, fieldPlanId: planId },
      Assignments: assignments,
    },
    { timeout: 20_000 },
  );

  return {
    id: data.fieldPlanId ?? planId,
    tenantId: user?.tenantId ?? "",
    projectId: "",
    additionalDetails: { status: data.planStatus ?? "PUBLISHED" },
  };
}
