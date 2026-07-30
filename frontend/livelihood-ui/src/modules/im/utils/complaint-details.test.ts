import { describe, expect, it } from "vitest";
import type { Incident, IncidentWorkflow } from "../types/incident-details";
import {
  buildComplaintDetailRows,
  buildComplaintDetailsData,
  isClosedTicket,
  translateDetailValue,
} from "./complaint-details";

const noopT = (key: string) => key;

function buildIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    tenantId: "livelihood",
    incidentId: "INC-1",
    applicationStatus: "PENDING_FOR_RESOLUTION",
    incidentType: "streetlight",
    incidentSubType: "not-working",
    ...overrides,
  };
}

describe("buildComplaintDetailRows", () => {
  it("builds the ticket number, status, and ticket type rows from the incident", () => {
    const rows = buildComplaintDetailRows("INC-1", buildIncident(), noopT);
    expect(rows).toContainEqual({ labelKey: "CS_COMPLAINT_DETAILS_TICKET_NO", value: "INC-1" });
    expect(rows).toContainEqual({
      labelKey: "CS_COMPLAINT_DETAILS_APPLICATION_STATUS",
      value: "CS_COMMON_PENDING_FOR_RESOLUTION",
    });
    expect(rows).toContainEqual({
      labelKey: "CS_ADDCOMPLAINT_TICKET_TYPE",
      value: "SERVICEDEFS.STREETLIGHT",
    });
  });

  it("falls back to '-' for the asset row when boundaryCode is missing", () => {
    const rows = buildComplaintDetailRows("INC-1", buildIncident({ boundaryCode: undefined }), noopT);
    expect(rows).toContainEqual({ labelKey: "CS_ADDCOMPLAINT_ASSET", value: "-" });
  });

  it("builds the asset row from boundaryCode when present", () => {
    const rows = buildComplaintDetailRows("INC-1", buildIncident({ boundaryCode: "B1" }), noopT);
    expect(rows).toContainEqual({ labelKey: "CS_ADDCOMPLAINT_ASSET", value: "BOUNDARY_B1" });
  });

  it("falls back block/district rows to '-' when missing", () => {
    const rows = buildComplaintDetailRows("INC-1", buildIncident(), noopT);
    expect(rows).toContainEqual({ labelKey: "CS_ADDCOMPLAINT_BLOCK", value: "-" });
    expect(rows).toContainEqual({ labelKey: "CS_ADDCOMPLAINT_DISTRICT", value: "-" });
  });

  it("falls back comments to '-' when empty", () => {
    const rows = buildComplaintDetailRows("INC-1", buildIncident({ comments: "" }), noopT);
    expect(rows).toContainEqual({ labelKey: "CS_COMPLAINT_COMMENTS", value: "-" });
  });

  it("uses the comments string when present", () => {
    const rows = buildComplaintDetailRows(
      "INC-1",
      buildIncident({ comments: "Needs urgent repair" }),
      noopT,
    );
    expect(rows).toContainEqual({
      labelKey: "CS_COMPLAINT_COMMENTS",
      value: "Needs urgent repair",
    });
  });

  it("formats the filed date from auditDetails.createdTime, falling back to '-' when absent", () => {
    const withDate = buildComplaintDetailRows(
      "INC-1",
      buildIncident({ auditDetails: { createdTime: 1700000000000 } }),
      noopT,
    );
    const withoutDate = buildComplaintDetailRows("INC-1", buildIncident(), noopT);

    expect(withDate.find((row) => row.labelKey === "CS_COMPLAINT_FILED_DATE")?.value).not.toBe(
      "-",
    );
    expect(withoutDate.find((row) => row.labelKey === "CS_COMPLAINT_FILED_DATE")?.value).toBe(
      "-",
    );
  });
});

describe("translateDetailValue", () => {
  it("returns the translated value when it differs from the key", () => {
    const t = (key: string) => (key === "BOUNDARY_B1" ? "Building One" : key);
    expect(translateDetailValue("BOUNDARY_B1", t)).toBe("Building One");
  });

  it("falls back to the raw value when the translation echoes the key back", () => {
    expect(translateDetailValue("-", noopT)).toBe("-");
  });
});

describe("buildComplaintDetailsData", () => {
  it("assembles the full details payload including media and derived rows", () => {
    const incident = buildIncident();
    const workflow: IncidentWorkflow = { action: "APPLY" };
    const media = { images: ["img1"], videos: [], thumbnails: ["thumb1"] };

    const data = buildComplaintDetailsData("INC-1", incident, workflow, media, noopT);

    expect(data.incidentId).toBe("INC-1");
    expect(data.tenantId).toBe("livelihood");
    expect(data.incident).toBe(incident);
    expect(data.workflow).toBe(workflow);
    expect(data.images).toEqual(["img1"]);
    expect(data.thumbnails).toEqual(["thumb1"]);
    expect(data.rows.length).toBeGreaterThan(0);
  });
});

describe("isClosedTicket", () => {
  it("returns true for CLOSED_AFTER_RESOLUTION", () => {
    expect(isClosedTicket("CLOSED_AFTER_RESOLUTION")).toBe(true);
  });

  it("returns true for CLOSED_AFTER_DECLINE", () => {
    expect(isClosedTicket("CLOSED_AFTER_DECLINE")).toBe(true);
  });

  it("returns false for a non-terminal status", () => {
    expect(isClosedTicket("PENDING_FOR_RESOLUTION")).toBe(false);
  });

  it("returns false when status is undefined", () => {
    expect(isClosedTicket(undefined)).toBe(false);
  });
});
