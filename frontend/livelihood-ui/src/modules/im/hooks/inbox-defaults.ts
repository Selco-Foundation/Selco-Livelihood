import { hasRole, isTechPocUser, type AuthUser } from "@/shared";
import type { ImInboxFilters } from "../types/inbox";

export function buildDefaultInboxRoleFilters(
  user: AuthUser | null | undefined,
): ImInboxFilters {
  const userUuid = user?.uuid ?? "";
  const roles = user?.roles;

  if (hasRole(roles, "COMPLAINT_RESOLVER")) {
    return {
      wfFilters: { assignee: [{ code: userUuid }] },
      pgrfilters: {
        incidentType: [],
        facility: [],
        state: [],
        district: [],
        block: [],
        applicationStatus: [],
      },
    };
  }

  if (isTechPocUser(roles)) {
    return {
      wfFilters: {
        assignee: [{ code: userUuid }],
        wfStatus: [
          { code: "RMS_DEVICE_PENDING_TECH_POC" },
          { code: "OUT_OF_WARRANTY_PENDING_TECH_POC" },
          { code: "OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2" },
        ],
      },
      pgrfilters: {
        incidentType: [],
        facility: [],
        state: [],
        district: [],
        block: [],
        applicationStatus: [],
      },
    };
  }

  return {
    wfFilters: { assignee: [{ code: "" }] },
    pgrfilters: {
      incidentType: [],
      facility: [],
      state: [],
      district: [],
      block: [],
      applicationStatus: [],
    },
  };
}

export function buildSummaryRoleFilters(
  user: AuthUser | null | undefined,
): Record<string, unknown> {
  const userUuid = user?.uuid ?? "";
  const roles = user?.roles;

  if (hasRole(roles, "COMPLAINT_RESOLVER")) {
    return { assignee: userUuid };
  }

  if (isTechPocUser(roles)) {
    return {
      assignee: userUuid,
      wfStatus:
        "RMS_DEVICE_PENDING_TECH_POC,OUT_OF_WARRANTY_PENDING_TECH_POC,OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2",
    };
  }

  return {};
}
