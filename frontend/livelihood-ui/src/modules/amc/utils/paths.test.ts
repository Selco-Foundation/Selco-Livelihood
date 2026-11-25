import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { amcProjectReportsPath, amcProjectsPath, amcReportDetailPath, amcReportsPath } from "./paths";
import { formatAmcDate } from "./date";

describe("amc path builders", () => {
  beforeEach(() => {
    window.globalConfigs = { getConfig: () => "livelihood-ui" };
  });

  afterEach(() => {
    window.globalConfigs = { getConfig: () => undefined };
  });

  it("builds the reports and report detail paths", () => {
    expect(amcReportsPath()).toBe("/livelihood-ui/employee/amc/reports");
    expect(amcReportDetailPath("r1")).toBe("/livelihood-ui/employee/amc/reports/r1");
  });

  it("builds the projects and project reports paths", () => {
    expect(amcProjectsPath()).toBe("/livelihood-ui/employee/amc/projects");
    expect(amcProjectReportsPath("p1")).toBe("/livelihood-ui/employee/amc/projects/p1");
  });
});

describe("formatAmcDate", () => {
  it("formats an epoch as dd MMM yyyy, and a missing date as '-'", () => {
    expect(formatAmcDate(new Date(2026, 10, 6).getTime())).toBe("06 Nov 2026");
    expect(formatAmcDate(undefined)).toBe("-");
  });
});
