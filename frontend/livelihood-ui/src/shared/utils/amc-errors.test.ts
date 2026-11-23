import { describe, expect, it } from "vitest";
import { amcErrorText, parseAmcErrorRows } from "./amc-errors";

const t = (key: string) => key;
const apiError = (...Errors: { code?: string; message?: string }[]) => ({ response: { data: { Errors } } });

describe("parseAmcErrorRows", () => {
  it("reads every row of a message, keeping a ';' inside a reason", () => {
    expect(
      parseAmcErrorRows(
        "row 1 (amc-1), id: a completed AMC can't be changed; start a new AMC instead; row 3 (amc-3), id: a completed AMC can't be changed",
      ),
    ).toEqual([
      { index: 0, id: "amc-1" },
      { index: 2, id: "amc-3" },
    ]);
  });

  it("reads a row without an id, and nothing from another message", () => {
    expect(parseAmcErrorRows("row 2, activityFacilityId: activityFacilityId is required")).toEqual([
      { index: 1, id: undefined },
    ]);
    expect(parseAmcErrorRows("Something failed")).toEqual([]);
  });
});

describe("amcErrorText", () => {
  it("names the end users instead of row numbers and ids", () => {
    const error = apiError({
      code: "DUPLICATE_AMC_CONFIGURATION",
      message: "row 1 (af1), activityFacilityId: already running; row 2 (af2), activityFacilityId: already running",
    });
    const names = ["Priya", "Nipe"];
    expect(amcErrorText(error, t, (row) => names[row.index])).toBe("Priya, Nipe: an AMC is already running");
  });

  it("shows every error and keeps the server's message for an unknown code", () => {
    const error = apiError(
      { code: "AMC_START_DATE_LOCKED", message: "row 1 (a), configurationStartDate: locked" },
      { code: "SOMETHING_ELSE", message: "Server says no" },
    );
    expect(amcErrorText(error, t)).toBe("The start date can't change once visit 1 is submitted; Server says no");
  });

  it("prefers the localized text", () => {
    const localized = (key: string) => (key === "ES_AMC_ERR_AMC_COMPLETED" ? "translated" : key);
    expect(amcErrorText(apiError({ code: "AMC_COMPLETED", message: "row 1 (a), id: x" }), localized, () => "Priya")).toBe(
      "Priya: translated",
    );
  });

  it("explains errors thrown before the call, and has nothing for an unrelated one", () => {
    expect(amcErrorText(new Error("AMC_INSTALLATION_NOT_READY"), t)).toContain("not ready yet");
    expect(amcErrorText(new Error("Network Error"), t)).toBeUndefined();
  });
});
