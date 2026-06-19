import { hasRole, isTechPocUser, type AuthUser } from "@/shared";
import type { ImInboxFilters } from "../types/inbox";

export function buildDefaultInboxRoleFilters(
  user: AuthUser | null | undefined,
): ImInboxFilters {
  const userName = user?.userName ?? "";
  const roles = user?.roles;

  if (hasRole(roles, "COMPLAINT_RESOLVER")) {
    return {
      wfFilters: { assignee: [{ code: userName }] },
      pgrfilters: {
        incidentType: [],
        facility: [],
        state: [],
        district: [],
        block: [],
        isSystemFunctional: [],
        applicationStatus: [],
      },
    };
  }

  if (isTechPocUser(roles)) {
    return {
      wfFilters: {
        assignee: [{ code: userName }],
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
        isSystemFunctional: [],
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
      isSystemFunctional: [],
      applicationStatus: [],
    },
  };
}

export function buildSummaryRoleFilters(
  user: AuthUser | null | undefined,
): Record<string, unknown> {
  const userName = user?.userName ?? "";
  const roles = user?.roles;

  if (hasRole(roles, "COMPLAINT_RESOLVER")) {
    return { assignee: userName };
  }

  if (isTechPocUser(roles)) {
    return {
      assignee: userName,
      wfStatus:
        "RMS_DEVICE_PENDING_TECH_POC,OUT_OF_WARRANTY_PENDING_TECH_POC,OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2",
    };
  }

  return {};
}
