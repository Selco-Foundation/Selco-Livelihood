import type { AuthUser } from "@/shared";
import {
  BLANK_SLA_STATUSES,
  ROLE_STATUS_MAPPING,
} from "../constants/workflow";
import type {
  InboxItem,
  InboxRow,
  InboxSearchResponse,
  InboxStatusMapEntry,
} from "../types/inbox";

const SLA_MS_PER_DAY = 8 * 60 * 60 * 1000;

export function combineInboxResponses(
  items: InboxItem[],
  currentUser: AuthUser | null | undefined,
  t: (key: string) => string,
): InboxRow[] {
  const currentUserUuid = currentUser?.uuid;
  const currentUserRoles = currentUser?.roles?.map((role) => role.code).filter(Boolean) as string[];
  const isEndUser = currentUserRoles?.every(
    (role) => role === "EMPLOYEE" || role === "COMPLAINANT",
  );

  return items.map(({ businessObject, ProcessInstance }) => {
    const incident = businessObject?.incident ?? {
      incidentId: "",
      incidentType: "",
      applicationStatus: "",
      tenantId: "",
    };
    const assignee = ProcessInstance?.assignes?.[0];
    const assigneeUuid = assignee?.uuid;

    let slaValue: string | number = "-";

    if ((BLANK_SLA_STATUSES as readonly string[]).includes(incident.applicationStatus)) {
      slaValue = "-";
    } else if (isEndUser) {
      const totalSla = businessObject?.totalSlaRemaining ?? 0;
      slaValue = totalSla < 0 ? t("SLA_OVERDUE") : Math.ceil(totalSla / SLA_MS_PER_DAY);
    } else if (assigneeUuid && currentUserUuid === assigneeUuid) {
      const sla = businessObject?.slaRemaining ?? 0;
      slaValue = Math.ceil(sla / SLA_MS_PER_DAY);
    } else if (!assigneeUuid) {
      const requiredRoles = ROLE_STATUS_MAPPING[incident.applicationStatus];
      if (requiredRoles?.some((role) => currentUserRoles?.includes(role))) {
        const sla = businessObject?.slaRemaining ?? 0;
        slaValue = Math.ceil(sla / SLA_MS_PER_DAY);
      }
    }

    return {
      incidentId: incident.incidentId,
      incidentType: incident.incidentType,
      assetLabel: incident.boundaryCode ? `BOUNDARY_${incident.boundaryCode}` : "-",
      status: incident.applicationStatus,
      taskOwner: assignee?.name || "-",
      sla: `${slaValue}`,
      endUser: incident.reporter?.name || "-",
      tenantId: incident.tenantId,
      potentialDuplicate:
        (currentUserRoles?.includes("LIVELIHOOD_POC") && !!incident.isPotentialDuplicate) ??
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

export function sumStatusCounts(
  statusArray: InboxStatusMapEntry[] | undefined,
  statuses: readonly string[],
): number {
  return (statusArray ?? []).reduce(
    (sum, entry) => (statuses.includes(entry.statusid) ? sum + (entry.count ?? 0) : sum),
    0,
  );
}
