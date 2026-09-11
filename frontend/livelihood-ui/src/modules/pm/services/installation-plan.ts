import type {
  InstallationPlan,
  InstallationPlanSearchCriteria,
  InstallationPlanSearchResult,
} from "../types/installation-plan";

// No `/field-planner` backend endpoint is wired up yet — this whole file
// stands in for it with a `localStorage`-backed mock store. Swap each
// function's body for the matching request (documented above it) once the
// real field-planner service is available; the shapes here already match.
const STORAGE_KEY = "pm-mock-installation-plans";

const SEED_PLANS: InstallationPlan[] = [
  {
    id: "seed-plan-1",
    tenantId: "pg",
    projectId: "seed-project-1",
    name: "AS-INS-2026-12",
    geographyDetails: {
      states: [{ code: "KA" }],
      districts: [{ code: "BLR", stateCode: "KA" }],
      blocks: [{ code: "BLR_EAST", districtCode: "BLR", stateCode: "KA" }],
    },
    startDate: Date.UTC(2026, 6, 15),
    endDate: Date.UTC(2026, 6, 16),
    additionalDetails: {
      sectorCode: "MICRO_BUSINESS",
      reviewerCode: "reviewer-1",
      status: "DRAFT",
      scope: [{ siteId: "ED/2026/0098", included: true, solutionCode: "202526PASF0000214" }],
    },
  },
  {
    id: "seed-plan-2",
    tenantId: "pg",
    projectId: "seed-project-1",
    name: "AS-INS-2026-13",
    geographyDetails: {
      states: [{ code: "KA" }],
      districts: [{ code: "BLR", stateCode: "KA" }],
      blocks: [{ code: "BLR_EAST", districtCode: "BLR", stateCode: "KA" }],
    },
    startDate: Date.UTC(2026, 6, 17),
    endDate: Date.UTC(2026, 6, 18),
    additionalDetails: {
      sectorCode: "ANIMAL_HUSBANDRY",
      reviewerCode: "reviewer-2",
      // Seed-only flavor status for the list view — this wizard itself only
      // ever produces DRAFT -> PUBLISHED.
      status: "APPROVED",
      scope: [{ siteId: "ED/2026/0093", included: true, solutionCode: "202526PASF0000371" }],
    },
  },
  {
    id: "seed-plan-3",
    tenantId: "pg",
    projectId: "seed-project-1",
    name: "AS-INS-2026-14",
    geographyDetails: {
      states: [{ code: "KA" }],
      districts: [{ code: "BLR", stateCode: "KA" }],
      blocks: [{ code: "BLR_EAST", districtCode: "BLR", stateCode: "KA" }],
    },
    startDate: Date.UTC(2026, 6, 19),
    endDate: Date.UTC(2026, 6, 20),
    additionalDetails: {
      sectorCode: "TEXTILE_CRAFTS",
      reviewerCode: "reviewer-3",
      status: "SCHEDULED",
      scope: [{ siteId: "ED/2026/0095", included: true, solutionCode: "202526PASF0000104" }],
    },
  },
  {
    id: "seed-plan-4",
    tenantId: "pg",
    projectId: "seed-project-1",
    name: "AS-INS-2026-15",
    geographyDetails: {
      states: [{ code: "KA" }],
      districts: [{ code: "BLR", stateCode: "KA" }],
      blocks: [{ code: "BLR_EAST", districtCode: "BLR", stateCode: "KA" }],
    },
    startDate: Date.UTC(2026, 6, 21),
    endDate: Date.UTC(2026, 6, 22),
    additionalDetails: {
      sectorCode: "AGRICULTURE",
      reviewerCode: "reviewer-1",
      status: "PENDING_APPROVAL",
      scope: [{ siteId: "ED/2026/0094", included: true, solutionCode: "202526PASF0000317" }],
    },
  },
];

function readStore(): InstallationPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      writeStore(SEED_PLANS);
      return SEED_PLANS;
    }
    return JSON.parse(raw) as InstallationPlan[];
  } catch {
    return SEED_PLANS;
  }
}

function writeStore(plans: InstallationPlan[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // best-effort — a private window or full quota shouldn't crash the wizard
  }
}

function generatePlanId() {
  return `mock-plan-${Math.random().toString(36).slice(2, 10)}`;
}

/** India's financial year runs April–March; returns e.g. "2627" for a date
 *  falling in FY 2026-27. */
function financialYearCode(dateMillis: number | undefined): string {
  const date = dateMillis ? new Date(dateMillis) : new Date();
  const year = date.getUTCFullYear();
  const fyStart = date.getUTCMonth() >= 3 ? year : year - 1;
  const fyEnd = fyStart + 1;
  return `${String(fyStart).slice(-2)}${String(fyEnd).slice(-2)}`;
}

/** Plan code format: `<stateCode>-INS-<FY start+end>-<serial>`, e.g.
 *  "KA-INS-2026-001" — the serial is a simple running count of all plans
 *  created so far (a real backend would likely scope this per project/FY). */
function generatePlanCode(stateCode: string, startDate: number | undefined, existing: InstallationPlan[]): string {
  const serial = String(existing.length + 1).padStart(3, "0");
  return `${stateCode || "XX"}-INS-${financialYearCode(startDate)}-${serial}`;
}

/**
 * Mock stand-in for `POST /field-planner/v1/field-plans/_create`
 * (plus the reviewer `POST /activity/v1/activities/_assign-activity` call
 * made alongside it in the real flow).
 */
export async function createInstallationPlan(plan: InstallationPlan): Promise<InstallationPlan> {
  const plans = readStore();
  const stateCode = plan.geographyDetails?.states?.[0]?.code ?? "";
  const created: InstallationPlan = {
    ...plan,
    id: generatePlanId(),
    name: plan.name ?? generatePlanCode(stateCode, plan.startDate, plans),
  };
  writeStore([...plans, created]);
  return created;
}

/**
 * Mock stand-in for the real update path (`field-plans` doesn't expose a
 * dedicated `_update`, but the same shape applies for editing a draft plan).
 */
export async function updateInstallationPlan(plan: InstallationPlan): Promise<InstallationPlan> {
  const plans = readStore();
  writeStore(plans.map((existing) => (existing.id === plan.id ? plan : existing)));
  return plan;
}

/**
 * Mock stand-in for `POST /field-planner/v1/field-plans/_search`.
 */
export async function searchInstallationPlans({
  criteria,
  limit = 10,
  offset = 0,
}: {
  criteria?: InstallationPlanSearchCriteria;
  limit?: number;
  offset?: number;
}): Promise<InstallationPlanSearchResult> {
  let plans = readStore();

  if (criteria?.id?.length) {
    const ids = new Set(criteria.id);
    plans = plans.filter((plan) => plan.id && ids.has(plan.id));
  }
  if (criteria?.projectId) {
    plans = plans.filter((plan) => plan.projectId === criteria.projectId);
  }

  const totalCount = plans.length;
  const page = plans.slice(offset, offset + limit);

  return {
    plans: page.map((plan) => ({ plan, status: plan.additionalDetails?.status ?? "DRAFT" })),
    totalCount,
  };
}

/**
 * Mock stand-in for `POST /activity/v1/vendor-assignment/_create` — the
 * one-shot "Confirm & Submit" action on Technician Assignment. Moves the
 * plan out of "DRAFT" into "PUBLISHED"; irreversible in the real system.
 */
export async function publishInstallationPlan(planId: string): Promise<InstallationPlan> {
  const plans = readStore();
  const updated = plans.map((plan) =>
    plan.id === planId
      ? { ...plan, additionalDetails: { ...plan.additionalDetails, status: "PUBLISHED" } }
      : plan,
  );
  writeStore(updated);
  const published = updated.find((plan) => plan.id === planId);
  if (!published) {
    throw new Error(`Installation plan ${planId} not found`);
  }
  return published;
}
