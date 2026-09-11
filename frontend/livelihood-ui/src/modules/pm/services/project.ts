import type { Project, ProjectListFilters, ProjectSearchCriteria, ProjectV2SearchResult } from "../types/project";

// No `/project` backend endpoint is wired up yet — this whole file stands in
// for it with a `localStorage`-backed mock store, so a project (and an
// in-progress creation wizard) survives a page reload during UI development.
// Swap each function's body for the matching `apiClient.post` call
// documented above it once the real project service is available; the
// request/response shapes here already match what the backend expects.
// Bump the "-v2" suffix whenever the seed shape/status values change, so a
// browser that already seeded under an older shape (e.g. status "SCHEDULED"
// before it was renamed to "ACTIVE") doesn't keep serving stale mock data
// forever — the seed-on-first-read only writes when the key is absent.
const STORAGE_KEY = "pm-mock-projects-v2";

const SEED_PROJECTS: Project[] = [
  {
    id: "seed-project-1",
    tenantId: "pg",
    projectNumber: "PRJ-2026-0001",
    name: "SLKA-2627-001",
    projectType: "PROJECT",
    projectSubType: "PROJECT",
    startDate: Date.UTC(2026, 3, 1),
    endDate: Date.UTC(2026, 8, 30),
    additionalDetails: {
      justificationCode: "SLKA",
      status: "ACTIVE",
      geographyDetails: {
        states: [{ code: "KA" }],
        districts: [{ code: "BLR", stateCode: "KA" }],
        blocks: [{ code: "BLR_EAST", districtCode: "BLR", stateCode: "KA" }],
      },
    },
  },
  {
    id: "seed-project-2",
    tenantId: "pg",
    projectNumber: "PRJ-2026-0002",
    name: "SLTN-2627-002",
    projectType: "PROJECT",
    projectSubType: "PROJECT",
    startDate: Date.UTC(2026, 5, 15),
    additionalDetails: {
      justificationCode: "SLTN",
      geographyDetails: {
        states: [{ code: "TN" }],
      },
    },
  },
];

/** India's financial year runs April–March; returns e.g. "2627" for a date
 *  falling in FY 2026-27. */
function financialYearCode(dateMillis: number | undefined): string {
  const date = dateMillis ? new Date(dateMillis) : new Date();
  const year = date.getUTCFullYear();
  const fyStart = date.getUTCMonth() >= 3 ? year : year - 1;
  const fyEnd = fyStart + 1;
  return `${String(fyStart).slice(-2)}${String(fyEnd).slice(-2)}`;
}

/** Project code format: `<justificationCode>-<FY start+end>-<serial>`, e.g.
 *  "SLKA-2627-001" — the serial is a simple running count of all projects
 *  created so far (a real backend would likely scope this per FY). */
function generateProjectCode(justificationCode: string, startDate: number | undefined, existing: Project[]): string {
  const serial = String(existing.length + 1).padStart(3, "0");
  return `${justificationCode}-${financialYearCode(startDate)}-${serial}`;
}

function readStore(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      writeStore(SEED_PROJECTS);
      return SEED_PROJECTS;
    }
    return JSON.parse(raw) as Project[];
  } catch {
    return SEED_PROJECTS;
  }
}

function writeStore(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // best-effort — a private window or full quota shouldn't crash the wizard
  }
}

function generateProjectId() {
  return `mock-project-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Mock stand-in for `POST /project/v1/_create`
 * (body: `{ RequestInfo, Projects: [project], apiOperation: "CREATE" }`,
 * response: `Project[0]`).
 */
export async function createProject(project: Project): Promise<Project> {
  const projects = readStore();
  const justificationCode = project.additionalDetails?.justificationCode ?? "";
  const created: Project = {
    ...project,
    id: generateProjectId(),
    projectNumber: `PRJ-${Date.now()}`,
    name: project.name ?? generateProjectCode(justificationCode, project.startDate, projects),
  };
  writeStore([...projects, created]);
  return created;
}

/**
 * Mock stand-in for `POST /project/v1/_update`
 * (body: `{ RequestInfo, Projects: [project], apiOperation: "UPDATE", isCascadingProjectDateUpdate: true }`).
 */
export async function updateProject(project: Project): Promise<Project> {
  const projects = readStore();
  writeStore(projects.map((existing) => (existing.id === project.id ? project : existing)));
  return project;
}

/**
 * Mock stand-in for `POST /project/v2/_search`
 * (body: `{ RequestInfo, Project: criteria }`, query params include
 * `tenantId`/`limit`/`offset`; response: `{ projects, totalCount }`).
 */
export async function searchProjects({
  criteria,
  filters,
  limit = 10,
  offset = 0,
}: {
  criteria?: ProjectSearchCriteria;
  filters?: ProjectListFilters;
  limit?: number;
  offset?: number;
}): Promise<ProjectV2SearchResult> {
  let projects = readStore();

  if (criteria?.id?.length) {
    const ids = new Set(criteria.id);
    projects = projects.filter((project) => project.id && ids.has(project.id));
  }
  if (criteria?.name) {
    const query = criteria.name.toLowerCase();
    projects = projects.filter((project) => project.name?.toLowerCase().includes(query));
  }
  if (filters?.stateCodes.length) {
    const selectedStates = new Set(filters.stateCodes);
    projects = projects.filter((project) =>
      project.additionalDetails?.geographyDetails?.states?.some((state) => selectedStates.has(state.code)),
    );
  }
  if (filters?.statuses.length) {
    const selectedStatuses = new Set(filters.statuses);
    projects = projects.filter((project) => selectedStatuses.has(project.additionalDetails?.status ?? "DRAFT"));
  }

  const totalCount = projects.length;
  const page = projects.slice(offset, offset + limit);

  return {
    projects: page.map((project) => ({
      project,
      status: project.additionalDetails?.status ?? "DRAFT",
    })),
    totalCount,
  };
}

/**
 * Mock stand-in for `POST /project/v1/project/workflow/update`
 * (body: `{ RequestInfo, projectId, workflow: { action: "SCHEDULED", comments: "Schedule Project" } }`).
 * Only reached after end-user data has been validated and facilities
 * created — moves the project out of "DRAFT" into "ACTIVE".
 */
export async function scheduleProject(projectId: string): Promise<Project> {
  const projects = readStore();
  const updatedProjects = projects.map((project) =>
    project.id === projectId
      ? { ...project, additionalDetails: { ...project.additionalDetails, status: "ACTIVE" } }
      : project,
  );
  writeStore(updatedProjects);

  const updatedProject = updatedProjects.find((project) => project.id === projectId);
  if (!updatedProject) throw new Error("Project not found");

  return updatedProject;
}
