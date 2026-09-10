import { isProjectManager, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchProjects } from "../services/project";

export interface UseProjectsSearchOptions {
  name?: string;
  limit?: number;
  offset?: number;
}

export function useProjectsSearch({ name, limit = 10, offset = 0 }: UseProjectsSearchOptions) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["pm-projects", name, limit, offset],
    enabled: isProjectManager(user?.roles),
    queryFn: () =>
      searchProjects({
        criteria: { subProjectTypeId: "PROJECT", ...(name ? { name } : {}) },
        limit,
        offset,
      }),
  });
}
