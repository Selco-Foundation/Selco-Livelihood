import { useQuery } from "@tanstack/react-query";
import { isProjectManager, useAuthStore } from "@/shared";
import { searchProjects } from "../services/project";
import type { ProjectSearchCriteria } from "../types/project";

export interface UseProjectsSearchParams {
  name?: string;
  limit: number;
  offset: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

export function useProjectsSearch(params: UseProjectsSearchParams) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const criteria: ProjectSearchCriteria = {
    subProjectTypeId: "PROJECT",
    ...(params.name ? { name: params.name } : {}),
  };

  const enabled = Boolean(accessToken) && isProjectManager(user?.roles);

  return useQuery({
    queryKey: ["pm-projects", criteria, params.limit, params.offset, params.sortBy, params.sortDirection],
    enabled,
    staleTime: 30_000,
    queryFn: () =>
      searchProjects({
        criteria,
        limit: params.limit,
        offset: params.offset,
        sortBy: params.sortBy,
        sortDirection: params.sortDirection,
        accessToken: accessToken!,
        user,
      }),
  });
}
