import { isProjectManager, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchProjects } from "../services/project";
import type { ProjectListFilters } from "../types/project";

export interface UseProjectsSearchOptions {
  name?: string;
  limit?: number;
  offset?: number;
  filters?: ProjectListFilters;
}

export function useProjectsSearch({ name, limit = 10, offset = 0, filters }: UseProjectsSearchOptions) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["pm-projects", name, filters, limit, offset],
    enabled: isProjectManager(user?.roles),
    queryFn: () =>
      searchProjects({
        criteria: { subProjectTypeId: "PROJECT", ...(name ? { name } : {}) },
        filters,
        limit,
        offset,
      }),
  });
}
