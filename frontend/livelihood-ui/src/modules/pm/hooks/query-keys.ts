import type { ProjectListFilters } from "../types/project";

/**
 * Query keys for every PM read, built as nested arrays so that invalidating a parent
 * invalidates its children.
 *
 * This shape matters: react-query matches a key by comparing array elements one by one,
 * **not** by string prefix. The flat keys these replaced (`"pm-installation-plan"` for the
 * detail read vs `"pm-installation-plans"` for the list) differ by a single character and
 * therefore never matched each other, so saving a plan refreshed the list but left the plan
 * itself — and its scope/reviewer/templates/facility-count reads — stale in cache.
 *
 * With the nesting below, `invalidateQueries({ queryKey: pmKeys.plans() })` reaches the list,
 * every plan detail and all of a plan's satellite reads in one call, and
 * `pmKeys.plan(id)` narrows that to a single plan.
 */
export const pmKeys = {
  all: ["pm"] as const,

  projects: () => [...pmKeys.all, "project"] as const,
  projectList: (name: string | undefined, filters: ProjectListFilters | undefined, limit: number, offset: number) =>
    [...pmKeys.projects(), "list", name, filters, limit, offset] as const,
  project: (projectId: string | undefined) => [...pmKeys.projects(), projectId] as const,

  plans: () => [...pmKeys.all, "plan"] as const,
  planList: (projectId: string | undefined, limit: number, offset: number) =>
    [...pmKeys.plans(), "list", projectId, limit, offset] as const,
  plan: (planId: string | undefined) => [...pmKeys.plans(), planId] as const,
  planScope: (planId: string | undefined) => [...pmKeys.plan(planId), "scope"] as const,
  planTemplates: (planId: string | undefined) => [...pmKeys.plan(planId), "templates"] as const,
  planReviewer: (planId: string | undefined) => [...pmKeys.plan(planId), "reviewer"] as const,
  planAssignments: (planId: string | undefined) => [...pmKeys.plan(planId), "assignments"] as const,
  planVendorAssignment: (planId: string | undefined) => [...pmKeys.plan(planId), "vendor-assignment"] as const,
  planFacilityCounts: (planIds: string[]) => [...pmKeys.plans(), "facility-counts", planIds] as const,

  // Reference data — tenant-wide, not scoped to one project or plan.
  /** `boundaryCodes` is the caller's pre-sorted, comma-joined code list, so the key stays
   *  stable across renders that rebuild the underlying array. */
  boundaryTree: (boundaryCodes: string) => [...pmKeys.all, "boundary-tree", boundaryCodes] as const,
  installationSolutions: () => [...pmKeys.all, "installation-solutions"] as const,
  reviewerOptions: () => [...pmKeys.all, "reviewer-options"] as const,
  vendorOrganisations: () => [...pmKeys.all, "vendor-organisations"] as const,
  vendorOrgUsers: (organizationId: string | undefined) => [...pmKeys.all, "vendor-org-users", organizationId] as const,
};
