import type { ComplaintDetailsData, ComplaintDetailsRow, Incident, IncidentWorkflow } from "../types/incident-details";
import { formatEpochToDate } from "./date-format";

export function buildComplaintDetailRows(
  incidentId: string,
  incident: Incident,
  t: (key: string) => string,
): ComplaintDetailsRow[] {
  const filedDate =
    incident.filedDate ??
    incident.auditDetails?.createdTime;

  return [
    { labelKey: "CS_COMPLAINT_DETAILS_TICKET_NO", value: incidentId },
    {
      labelKey: "CS_COMPLAINT_DETAILS_APPLICATION_STATUS",
      value: `CS_COMMON_${incident.applicationStatus}`,
    },
    {
      labelKey: "CS_ADDCOMPLAINT_TICKET_TYPE",
      value: `SERVICEDEFS.${incident.incidentType.toUpperCase()}`,
    },
    {
      labelKey: "CS_ADDCOMPLAINT_TICKET_SUB_TYPE",
      value: `SERVICEDEFS.${incident.incidentSubType.toUpperCase()}`,
    },
    {
      labelKey: "CS_ADDCOMPLAINT_SYSTEM_FUNCTIONAL",
      value: incident.systemFunctional ?? "-",
    },
    { labelKey: "CS_ADDCOMPLAINT_DISTRICT", value: incident.district ?? "-" },
    { labelKey: "CS_ADDCOMPLAINT_BLOCK", value: incident.block ?? "-" },
    {
      labelKey: "CS_ADDCOMPLAINT_HEALTH_CARE_CENTRE",
      value: incident.boundaryCode ? `Boundary_${incident.boundaryCode}` : "-",
    },
    { labelKey: "CS_COMPLAINT_COMMENTS", value: incident.comments ?? "-" },
    {
      labelKey: "CS_ADDCOMPLAINT_HEALTH_CARE_SUB_TYPE",
      value: incident.phcSubType ?? "-",
    },
    {
      labelKey: "CS_COMPLAINT_FILED_DATE",
      value: formatEpochToDate(filedDate),
    },
  ].map((row) => ({
    ...row,
    value:
      row.labelKey === "CS_COMPLAINT_DETAILS_TICKET_NO" ||
      row.labelKey === "CS_ADDCOMPLAINT_DISTRICT" ||
      row.labelKey === "CS_ADDCOMPLAINT_BLOCK" ||
      row.labelKey === "CS_COMPLAINT_COMMENTS" ||
      row.labelKey === "CS_ADDCOMPLAINT_HEALTH_CARE_SUB_TYPE" ||
      row.labelKey === "CS_COMPLAINT_FILED_DATE" ||
      row.labelKey === "CS_ADDCOMPLAINT_SYSTEM_FUNCTIONAL"
        ? row.value
        : row.value,
  }));
}

export function translateDetailValue(
  value: string,
  t: (key: string) => string,
): string {
  const translated = t(value);
  return translated === value ? value : translated;
}

export function buildComplaintDetailsData(
  incidentId: string,
  incident: Incident,
  workflow: IncidentWorkflow,
  media: {
    images: string[];
    videos: Array<{ master?: string | null; original?: string | null }>;
    thumbnails: string[];
  },
  t: (key: string) => string,
): ComplaintDetailsData {
  return {
    incidentId,
    tenantId: incident.tenantId,
    rows: buildComplaintDetailRows(incidentId, incident, t),
    incident,
    workflow,
    images: media.images,
    videos: media.videos,
    thumbnails: media.thumbnails,
  };
}

export function isClosedTicket(status?: string): boolean {
  return status === "CLOSEDAFTERRESOLUTION";
}

export function isRmsTicketToReopen(
  applicationStatus?: string,
  incidentType?: string,
  nextActions: Array<{ action: string }> = [],
): boolean {
  const isTerminal =
    applicationStatus === "REJECTED" || applicationStatus === "RESOLVED";
  const isRms = incidentType?.toUpperCase() === "RMS DEVICE";
  if (!isTerminal || !isRms) {
    return false;
  }
  return nextActions.some((action) => action.action === "REOPEN_RMS");
}
