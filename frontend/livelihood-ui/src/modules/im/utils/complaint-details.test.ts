/**
 * Unit tests for complaint-details.ts.
 *
 * These helpers are pure functions that shape raw incident/workflow data into the
 * view-model rows and payload the complaint details screen renders, plus a couple
 * of small predicates (closed-ticket check, translate-or-fallback). Nothing here
 * touches the network, DOM, or i18n runtime, so no mocking, providers, or render
 * wrappers are needed — a fake `t` function (either the `noopT` identity stub or
 * an inline translation map) is enough to exercise the translation-dependent
 * branches, and plain object/array assertions verify the shape of the output.
 */
import { describe, expect, it } from "vitest";
import type { Incident, IncidentWorkflow } from "../types/incident-details";
import {
  buildComplaintDetailRows,
  buildComplaintDetailsData,
  isClosedTicket,
  translateDetailValue,
} from "./complaint-details";

// Identity "translator" stub: returns the key unchanged, standing in for an i18n
// `t` function whenever a test doesn't care about actual translated output.
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

// buildComplaintDetailRows maps an Incident onto the ordered list of
// { labelKey, value } rows shown on the complaint details screen: ticket
// number, application status, ticket type, asset/boundary, block, district,
// comments, and filed date. Most fields fall back to "-" when the source data
// is missing, and several values are composed into translation-key strings
// (e.g. `CS_COMMON_<status>`, `SERVICEDEFS.<TYPE>`, `BOUNDARY_<code>`) that the
// caller is expected to run through `t` later.
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

  // Asset row only becomes `BOUNDARY_<code>` when boundaryCode is set; an
  // undefined boundaryCode must render as "-" rather than "BOUNDARY_undefined".
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

  // Comments row uses `comments?.length` (not just truthiness) to decide the
  // fallback, so an explicit empty string ("") must still resolve to "-" rather
  // than being rendered as blank.
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

  // Filed date is read from the nested auditDetails.createdTime epoch and run
  // through formatEpochToDate; without a createdTime, formatEpochToDate itself
  // is expected to return "-", so we only assert "has a value" vs. "is '-'"
  // rather than pin an exact formatted string here.
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

// translateDetailValue wraps translateOr(t, value, value): it looks up `value`
// as a translation key and returns the translated string, but falls back to the
// raw `value` itself whenever the translator doesn't actually translate it
// (i.e. echoes the key back unchanged) — which matters for values like "-" that
// are display placeholders rather than real translation keys.
describe("translateDetailValue", () => {
  it("returns the translated value when it differs from the key", () => {
    const t = (key: string) => (key === "BOUNDARY_B1" ? "Building One" : key);
    expect(translateDetailValue("BOUNDARY_B1", t)).toBe("Building One");
  });

  // "-" has no matching translation entry, so `noopT` echoes it back unchanged;
  // translateOr's fallback rule must treat that echo as "not translated" and
  // return the original value rather than an empty/undefined result.
  it("falls back to the raw value when the translation echoes the key back", () => {
    expect(translateDetailValue("-", noopT)).toBe("-");
  });
});

// buildComplaintDetailsData is the top-level assembler for the complaint
// details screen: it combines incidentId, incident, workflow, and media
// (images/videos/thumbnails) with the rows produced by buildComplaintDetailRows
// into the single ComplaintDetailsData payload the view consumes.
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

// isClosedTicket answers whether a given applicationStatus is one of the
// TERMINAL_APPLICATION_STATUSES (the closed states from constants/workflow),
// treating an undefined status as not closed rather than throwing.
describe("isClosedTicket", () => {
  // Both terminal statuses defined in TERMINAL_APPLICATION_STATUSES must be
  // recognized as closed — asserting only one wouldn't catch a partial list.
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
