import type { AuthUser } from "@/shared";
import type { InboxItem, InboxRow, InboxSearchResponse } from "../types/inbox";

const CLOSED_STATES = ["RESOLVED", "CLOSEDAFTERRESOLUTION", "REJECTED", "CLOSEDAFTERREJECTION"];

const ROLE_STATUS_MAPPING: Record<string, string> = {
  PENDINGFORASSIGNMENT: "COMPLAINT_ASSESSOR",
  PENDINGFORASSIGNMENT_THEFT: "COMPLAINT_ASSESSOR",
  PENDINGFORASSIGNMENT_RMS_DEVICE: "COMPLAINT_ASSESSOR",
  RMS_DEVICE_PENDING_TECH_POC: "COMPLAINT_FACILITATOR_2",
  PENDING_ASSIGNMENT_OUT_OF_WARRANTY: "COMPLAINT_FACILITATOR_1",
  OUT_OF_WARRANTY_PENDING_TECH_POC: "COMPLAINT_FACILITATOR_2",
  OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2: "COMPLAINT_FACILITATOR_2",
  OUT_OF_SCOPE: "COMPLAINT_FACILITATOR_1",
  PENDING_ASSIGNMENT_SPARE_PART_NEEDED: "COMPLAINT_FACILITATOR_2",
};

const SLA_MS_PER_DAY = 8 * 60 * 60 * 1000;

export function combineInboxResponses(
  items: InboxItem[],
  currentUser: AuthUser | null | undefined,
  t: (key: string) => string,
): InboxRow[] {
  const currentUserUuid = currentUser?.uuid;
  const currentUserRoles = currentUser?.roles?.map((role) => role.code).filter(Boolean) as string[];
  const isHcrUser = currentUserRoles?.every(
    (role) => role === "EMPLOYEE" || role === "COMPLAINANT",
  );

  return items.map(({ businessObject, ProcessInstance }) => {
    const incident = businessObject?.incident ?? {
      incidentId: "",
      incidentType: "",
      incidentSubType: "",
      applicationStatus: "",
      tenantId: "",
    };
    const assignee = ProcessInstance?.assignes?.[0];
    const assigneeUuid = assignee?.uuid;

    let slaValue: string | number = "-";

    if (CLOSED_STATES.includes(incident.applicationStatus)) {
      slaValue = "-";
    } else if (isHcrUser) {
      const totalSla = businessObject?.totalSlaRemaining ?? 0;
      slaValue = totalSla < 0 ? t("SLA_OVERDUE") : Math.ceil(totalSla / SLA_MS_PER_DAY);
    } else if (assigneeUuid && currentUserUuid === assigneeUuid) {
      const sla = businessObject?.slaRemaining ?? 0;
      slaValue = Math.ceil(sla / SLA_MS_PER_DAY);
    } else if (!assigneeUuid) {
      const requiredRole = ROLE_STATUS_MAPPING[incident.applicationStatus];
      if (requiredRole && currentUserRoles?.includes(requiredRole)) {
        const sla = businessObject?.slaRemaining ?? 0;
        slaValue = Math.ceil(sla / SLA_MS_PER_DAY);
      }
    }

    return {
      incidentId: incident.incidentId,
      incidentType: incident.incidentType,
      incidentSubType: incident.incidentSubType,
      phcType: incident.phcType,
      facility: incident.boundary?.facilityCode
        ? `BOUNDARY_${incident.boundary.facilityCode}`
        : "-",
      status: incident.applicationStatus,
      taskOwner: assignee?.name || "-",
      sla: `${slaValue}`,
      tenantId: incident.tenantId,
      potentialDuplicate:
        (currentUserRoles?.includes("COMPLAINT_ASSESSOR") && !!incident.isPotentialDuplicate) ??
        false,
    };
  });
}

export function normalizeInboxResponse(data: InboxSearchResponse) {
  return {
    total: data.totalCount ?? 0,
    items: data.items ?? [],
    statusArray: data.statusMap ?? [],
    nearingSlaCount: data.nearingSlaCount,
  };
}
