import type { RawAmcSchedule } from "../types/amc";
import { buildDemoAmcSchedules } from "./amc-demo-project";

// Prototype-only seed for the static AMC schedule service. Delete with the static service once the
// AMC configuration API exists.

const DAY = 24 * 60 * 60 * 1000;
const BASE_START = Date.UTC(2026, 10, 6);

const END_USERS: Array<Pick<RawAmcSchedule, "endUser" | "boundary"> & { offsetDays: number; frequency: number; years: number }> = [
  { endUser: { name: "user979", mobileNumber: "9876543210" }, boundary: { state: "Assam", district: "Kamrup", block: "Rangia" }, offsetDays: 0, frequency: 6, years: 1 },
  { endUser: { name: "user980", mobileNumber: "9845012876" }, boundary: { state: "Karnataka", district: "Tumakuru", block: "Gubbi" }, offsetDays: 0, frequency: 6, years: 1 },
  { endUser: { name: "user981", mobileNumber: "9701233458" }, boundary: { state: "Assam", district: "Barpeta", block: "Sorbhog" }, offsetDays: 2, frequency: 6, years: 2 },
  { endUser: { name: "user982", mobileNumber: "9900156782" }, boundary: { state: "Karnataka", district: "Mandya", block: "Maddur" }, offsetDays: 2, frequency: 12, years: 3 },
  { endUser: { name: "user983", mobileNumber: "9886090421" }, boundary: { state: "Karnataka", district: "Tumakuru", block: "Sira" }, offsetDays: 4, frequency: 6, years: 1 },
  { endUser: { name: "user984", mobileNumber: "9678044123" }, boundary: { state: "Assam", district: "Kamrup", block: "Chaygaon" }, offsetDays: 6, frequency: 6, years: 1 },
  { endUser: { name: "user985", mobileNumber: "9448123456" }, boundary: { state: "Karnataka", district: "Mandya", block: "Malavalli" }, offsetDays: 8, frequency: 12, years: 2 },
  { endUser: { name: "user986", mobileNumber: "9435067890" }, boundary: { state: "Assam", district: "Barpeta", block: "Barpeta" }, offsetDays: 8, frequency: 6, years: 1 },
];

export function buildDummyAmcSchedules(fieldPlanId: string): RawAmcSchedule[] {
  const demo = buildDemoAmcSchedules(fieldPlanId);
  if (demo) return demo;
  return END_USERS.map((entry, index) => ({
    id: `${fieldPlanId}-amc-${index + 1}`,
    fieldPlanId,
    facilityId: `${fieldPlanId}-site-${index + 1}`,
    endUser: entry.endUser,
    boundary: entry.boundary,
    componentType: "SOLAR",
    installationReportFirstSubmissionDate: BASE_START + entry.offsetDays * DAY,
    configurationStartDate: BASE_START + entry.offsetDays * DAY,
    visitFrequencyMonths: entry.frequency,
    durationMonths: entry.years * 12,
  }));
}
