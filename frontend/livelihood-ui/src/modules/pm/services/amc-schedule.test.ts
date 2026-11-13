import { afterEach, describe, expect, it } from "vitest";
import { AMC_SCHEDULES_STORAGE_KEY, resetStaticAmcSchedules, searchAmcSchedules, updateAmcSchedules } from "./amc-schedule";

afterEach(() => {
  resetStaticAmcSchedules();
});

describe("amc-schedule static service", () => {
  it("returns the dummy schedules for a plan", async () => {
    const response = await searchAmcSchedules("plan-static-1");

    expect(response.AmcSchedules.length).toBeGreaterThan(0);
    expect(response.AmcSchedules.every((schedule) => schedule.fieldPlanId === "plan-static-1")).toBe(true);
  });

  it("saves to localStorage and returns the saved schedules on the next search", async () => {
    const { AmcSchedules } = await searchAmcSchedules("plan-static-2");
    const edited = AmcSchedules.map((schedule, index) =>
      index === 0 ? { ...schedule, visitFrequencyMonths: 12 } : schedule,
    );

    await updateAmcSchedules("plan-static-2", edited);

    expect(JSON.parse(window.localStorage.getItem(AMC_SCHEDULES_STORAGE_KEY)!)["plan-static-2"][0].visitFrequencyMonths).toBe(12);
    expect((await searchAmcSchedules("plan-static-2")).AmcSchedules[0].visitFrequencyMonths).toBe(12);
  });

  it("keeps other plans' saved edits when one plan is saved", async () => {
    await updateAmcSchedules("plan-a", (await searchAmcSchedules("plan-a")).AmcSchedules.slice(0, 1));
    await updateAmcSchedules("plan-b", (await searchAmcSchedules("plan-b")).AmcSchedules.slice(0, 2));

    expect((await searchAmcSchedules("plan-a")).AmcSchedules).toHaveLength(1);
    expect((await searchAmcSchedules("plan-b")).AmcSchedules).toHaveLength(2);
  });

  it("falls back to the seed when the stored value is unreadable", async () => {
    window.localStorage.setItem(AMC_SCHEDULES_STORAGE_KEY, "not json");

    expect((await searchAmcSchedules("plan-static-3")).AmcSchedules.length).toBeGreaterThan(0);
  });

  it("returns the demo plans' end users, with not-installed sites left without a start date", async () => {
    const { AmcSchedules } = await searchAmcSchedules("demo-amc-plan-partial");

    expect(AmcSchedules).toHaveLength(8);
    expect(AmcSchedules.filter((schedule) => schedule.installationReportFirstSubmissionDate === null)).toHaveLength(4);
    expect(
      AmcSchedules.every((schedule) => (schedule.installationReportFirstSubmissionDate === null) === (schedule.configurationStartDate === null)),
    ).toBe(true);
  });
});
