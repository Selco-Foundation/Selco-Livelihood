import { describe, expect, it } from "vitest";
import {
  AMC_DEMO_PROJECT_NAME,
  amcDemoPlanName,
  amcDemoPlanRows,
  buildDemoAmcSchedules,
  isAmcDemoPlan,
  isAmcDemoProject,
} from "./amc-demo-project";

describe("AMC demo project", () => {
  it("matches only the demo project's code", () => {
    expect(isAmcDemoProject(AMC_DEMO_PROJECT_NAME)).toBe(true);
    expect(isAmcDemoProject("JUS-12345-26-26")).toBe(false);
    expect(isAmcDemoProject(undefined)).toBe(false);
  });

  it("offers one completed and one in-progress plan, tagged as demo", () => {
    const rows = amcDemoPlanRows("project-1", "tenant-1");

    expect(rows.map((row) => row.status)).toEqual(["COMPLETED", "IN_PROGRESS"]);
    expect(rows.every((row) => row.plan.projectId === "project-1" && row.plan.additionalDetails?.isAmcDemo)).toBe(true);
    expect(rows[0].plan.additionalDetails).toMatchObject({ demoSiteCount: 6, demoInstalledCount: 6 });
    expect(rows[1].plan.additionalDetails).toMatchObject({ demoSiteCount: 8, demoInstalledCount: 4 });
  });

  it("resolves demo plan ids and names", () => {
    expect(isAmcDemoPlan("demo-amc-plan-completed")).toBe(true);
    expect(isAmcDemoPlan("plan-1")).toBe(false);
    expect(amcDemoPlanName("demo-amc-plan-partial")).toBe("IN-INS-2026-42");
  });

  it("builds schedules for demo plans only, starting installed sites at their installation date", () => {
    const schedules = buildDemoAmcSchedules("demo-amc-plan-completed")!;

    expect(schedules).toHaveLength(6);
    expect(schedules.every((schedule) => schedule.configurationStartDate === schedule.installationReportFirstSubmissionDate)).toBe(true);
    expect(buildDemoAmcSchedules("plan-1")).toBeUndefined();
  });
});
