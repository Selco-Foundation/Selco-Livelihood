import type { RawAmcSchedule } from "../types/amc";
import type { InstallationPlanStatusWrapper } from "../types/installation-plan";

// Prototype-only: two static installation plans shown on one real dev project so the AMC screens
// can be demoed end to end. Delete with the static AMC services once the AMC API exists.

/** Matched against the project's `name` (its code) on the Project Details page. */
export const AMC_DEMO_PROJECT_NAME = "JUS-12345-04-26-26";

interface DemoEndUser {
  name: string;
  phone: string;
  state: string;
  district: string;
  block: string;
  /** Installation report first submission date; undefined = not installed yet (Pending Activation). */
  installedOn?: number;
  frequency: number;
  years: number;
}

interface DemoPlan {
  id: string;
  name: string;
  status: string;
  startDate: number;
  endDate: number;
  sectorCodes: string[];
  endUsers: DemoEndUser[];
}

const COMPLETED_PLAN: DemoPlan = {
  id: "demo-amc-plan-completed",
  name: "IN-INS-2026-41",
  status: "COMPLETED",
  startDate: Date.UTC(2026, 8, 1),
  endDate: Date.UTC(2026, 9, 15),
  sectorCodes: ["Agriculture", "Animal Husbandry"],
  endUsers: [
    { name: "Bina Das", phone: "9876501001", state: "Assam", district: "Kamrup", block: "Rangia", installedOn: Date.UTC(2026, 8, 8), frequency: 6, years: 1 },
    { name: "Ratul Bora", phone: "9876501002", state: "Assam", district: "Kamrup", block: "Chaygaon", installedOn: Date.UTC(2026, 8, 10), frequency: 6, years: 2 },
    { name: "Mamoni Kalita", phone: "9876501003", state: "Assam", district: "Barpeta", block: "Sorbhog", installedOn: Date.UTC(2026, 8, 15), frequency: 12, years: 3 },
    { name: "Jiten Nath", phone: "9876501004", state: "Assam", district: "Barpeta", block: "Barpeta", installedOn: Date.UTC(2026, 8, 22), frequency: 6, years: 1 },
    { name: "Purabi Deka", phone: "9876501005", state: "Assam", district: "Kamrup", block: "Rangia", installedOn: Date.UTC(2026, 9, 2), frequency: 6, years: 1 },
    { name: "Hemanta Saikia", phone: "9876501006", state: "Assam", district: "Kamrup", block: "Chaygaon", installedOn: Date.UTC(2026, 9, 9), frequency: 12, years: 2 },
  ],
};

const PARTIAL_PLAN: DemoPlan = {
  id: "demo-amc-plan-partial",
  name: "IN-INS-2026-42",
  status: "IN_PROGRESS",
  startDate: Date.UTC(2026, 10, 1),
  endDate: Date.UTC(2026, 11, 20),
  sectorCodes: ["Textile & craft", "Resilient micro business"],
  endUsers: [
    { name: "Anjali Bora", phone: "9876502001", state: "Assam", district: "Kamrup", block: "Rangia", installedOn: Date.UTC(2026, 10, 3), frequency: 6, years: 1 },
    { name: "Dipen Talukdar", phone: "9876502002", state: "Assam", district: "Barpeta", block: "Sorbhog", installedOn: Date.UTC(2026, 10, 5), frequency: 6, years: 1 },
    { name: "Rupa Medhi", phone: "9876502003", state: "Assam", district: "Kamrup", block: "Chaygaon", installedOn: Date.UTC(2026, 10, 7), frequency: 12, years: 2 },
    { name: "Nayan Choudhury", phone: "9876502004", state: "Assam", district: "Barpeta", block: "Barpeta", installedOn: Date.UTC(2026, 10, 10), frequency: 6, years: 1 },
    { name: "Gitanjali Baruah", phone: "9876502005", state: "Assam", district: "Kamrup", block: "Rangia", frequency: 6, years: 1 },
    { name: "Pranjal Sarma", phone: "9876502006", state: "Assam", district: "Kamrup", block: "Chaygaon", frequency: 6, years: 1 },
    { name: "Moushumi Gogoi", phone: "9876502007", state: "Assam", district: "Barpeta", block: "Sorbhog", frequency: 12, years: 1 },
    { name: "Bikash Kakati", phone: "9876502008", state: "Assam", district: "Barpeta", block: "Barpeta", frequency: 6, years: 2 },
  ],
};

const DEMO_PLANS = [COMPLETED_PLAN, PARTIAL_PLAN];

export function isAmcDemoProject(projectName: string | undefined): boolean {
  return projectName === AMC_DEMO_PROJECT_NAME;
}

export function isAmcDemoPlan(planId: string | undefined): boolean {
  return DEMO_PLANS.some((plan) => plan.id === planId);
}

export function amcDemoPlanName(planId: string | undefined): string | undefined {
  return DEMO_PLANS.find((plan) => plan.id === planId)?.name;
}

/** The demo plans as installation-plan rows, for the Project Details tables. */
export function amcDemoPlanRows(projectId: string, tenantId: string): InstallationPlanStatusWrapper[] {
  return DEMO_PLANS.map((plan) => ({
    plan: {
      id: plan.id,
      tenantId,
      projectId,
      name: plan.name,
      startDate: plan.startDate,
      endDate: plan.endDate,
      additionalDetails: {
        sectorCodes: plan.sectorCodes,
        isAmcDemo: true,
        demoSiteCount: plan.endUsers.length,
        demoInstalledCount: plan.endUsers.filter((endUser) => endUser.installedOn).length,
      },
    },
    status: plan.status,
  }));
}

/** AMC schedules for a demo plan: installed sites start from their installation date, the rest are
 *  Pending Activation (blank start date) until their installation report is submitted. */
export function buildDemoAmcSchedules(planId: string): RawAmcSchedule[] | undefined {
  const plan = DEMO_PLANS.find((item) => item.id === planId);
  if (!plan) return undefined;
  return plan.endUsers.map((endUser, index) => ({
    id: `${plan.id}-amc-${index + 1}`,
    fieldPlanId: plan.id,
    facilityId: `${plan.id}-site-${index + 1}`,
    endUser: { name: endUser.name, mobileNumber: endUser.phone },
    boundary: { state: endUser.state, district: endUser.district, block: endUser.block },
    componentType: "SOLAR",
    installationReportFirstSubmissionDate: endUser.installedOn ?? null,
    configurationStartDate: endUser.installedOn ?? null,
    visitFrequencyMonths: endUser.frequency,
    durationMonths: endUser.years * 12,
  }));
}
