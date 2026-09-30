import { describe, expect, it } from "vitest";
import type { Incident, IncidentWorkflow } from "../types/incident-details";
import {
  buildComplaintDetailRows,
  buildComplaintDetailsData,
  isClosedTicket,
  translateDetailValue,
} from "./complaint-details";

const mockT = (key: string) => key;

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    tenantId: "tenant-1",
    incidentId: "INC-1",
    applicationStatus: "PENDING_FOR_RESOLUTION",
    incidentType: "solar_light",
    incidentSubType: "not_working",
    ...overrides,
  };
}

describe("buildComplaintDetailRows", () => {
  it("builds every expected row with all optional fields present", () => {
    const incident = makeIncident({
      boundaryCode: "BOUNDARY_1",
      block: "BLOCK_1",
      district: "DISTRICT_1",
      comments: "Some comment",
      auditDetails: { createdTime: new Date(2026, 0, 15).getTime() },
    });

    const rows = buildComplaintDetailRows("INC-1", incident, mockT);

    expect(rows).toEqual([
      { labelKey: "CS_COMPLAINT_DETAILS_TICKET_NO", value: "INC-1" },
      {
        labelKey: "CS_COMPLAINT_DETAILS_APPLICATION_STATUS",
        value: "CS_COMMON_PENDING_FOR_RESOLUTION",
      },
      { labelKey: "CS_ADDCOMPLAINT_TICKET_TYPE", value: "SERVICEDEFS.SOLAR_LIGHT" },
      { labelKey: "CS_ADDCOMPLAINT_ASSET", value: "BOUNDARY_BOUNDARY_1" },
      { labelKey: "CS_ADDCOMPLAINT_BLOCK", value: "BLOCK_1" },
      { labelKey: "CS_ADDCOMPLAINT_DISTRICT", value: "DISTRICT_1" },
      { labelKey: "CS_COMPLAINT_COMMENTS", value: "Some comment" },
      { labelKey: "CS_COMPLAINT_FILED_DATE", value: "15 Jan 2026" },
    ]);
  });

  it("falls back to a dash for missing boundary, block, district, and comments", () => {
    const incident = makeIncident({ comments: "" });

    const rows = buildComplaintDetailRows("INC-1", incident, mockT);

    expect(rows).toEqual(
      expect.arrayContaining([
        { labelKey: "CS_ADDCOMPLAINT_ASSET", value: "-" },
        { labelKey: "CS_ADDCOMPLAINT_BLOCK", value: "-" },
        { labelKey: "CS_ADDCOMPLAINT_DISTRICT", value: "-" },
        { labelKey: "CS_COMPLAINT_COMMENTS", value: "-" },
      ]),
    );
  });

  it("falls back to a dash for the filed date when auditDetails.createdTime is missing", () => {
    const incident = makeIncident();
    const rows = buildComplaintDetailRows("INC-1", incident, mockT);
    expect(rows).toContainEqual({ labelKey: "CS_COMPLAINT_FILED_DATE", value: "-" });
  });
});

describe("translateDetailValue", () => {
  it("returns the translated value when a translation is found", () => {
    const t = (key: string) => (key === "CS_COMMON_RESOLVED" ? "Resolved" : key);
    expect(translateDetailValue("CS_COMMON_RESOLVED", t)).toBe("Resolved");
  });

  it("falls back to the raw value when no translation is found", () => {
    expect(translateDetailValue("-", mockT)).toBe("-");
  });
});

describe("buildComplaintDetailsData", () => {
  it("assembles the full details data from incident, workflow, and media", () => {
    const incident = makeIncident();
    const workflow: IncidentWorkflow = { action: "ASSIGN" };
    const media = {
      images: ["http://files/1.jpg"],
      videos: [{ master: "http://files/1.m3u8", original: "http://files/1.mp4" }],
      thumbnails: ["http://files/thumb.jpg"],
    };

    const result = buildComplaintDetailsData("INC-1", incident, workflow, media, mockT);

    expect(result).toEqual({
      incidentId: "INC-1",
      tenantId: "tenant-1",
      rows: buildComplaintDetailRows("INC-1", incident, mockT),
      incident,
      workflow,
      images: media.images,
      videos: media.videos,
      thumbnails: media.thumbnails,
    });
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
