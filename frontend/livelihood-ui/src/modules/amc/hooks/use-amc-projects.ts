import { useAuthStore } from "@/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchAmcProjectSummaries } from "../services/amc-visits";
import { hasAmcReviewerAccess } from "../utils/access";
import { toAmcProjectSummary } from "../utils/visit-mapping";
import { amcKeys } from "./query-keys";

/** Projects with submitted AMC reports, with their review counts (Project-Specific view). */
export function useAmcProjects(page: { offset: number; limit: number }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.projects(page),
    enabled: Boolean(accessToken) && hasAmcReviewerAccess(user?.roles),
    placeholderData: keepPreviousData,
    queryFn: () => searchAmcProjectSummaries(page, accessToken!, user),
    select: (response) => ({
      projects: (response.ProjectSummaries ?? []).map(toAmcProjectSummary),
      totalCount: response.TotalCount ?? 0,
    }),
  });
}

/** One project's summary, for its name in headings and breadcrumbs. */
export function useAmcProject(projectId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.project(projectId),
    enabled: Boolean(projectId && accessToken) && hasAmcReviewerAccess(user?.roles),
    staleTime: 5 * 60_000,
    queryFn: () => searchAmcProjectSummaries({ projectIds: [projectId!], offset: 0, limit: 1 }, accessToken!, user),
    select: (response) => {
      const summary = response.ProjectSummaries?.[0];
      return summary ? toAmcProjectSummary(summary) : null;
    },
  });
}
