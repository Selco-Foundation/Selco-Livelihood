import { useQuery } from "@tanstack/react-query";
import { searchProjects } from "../services/project";

export function useProjectById(projectId: string | undefined) {
  return useQuery({
    queryKey: ["pm-project", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const result = await searchProjects({ criteria: { id: [projectId!] }, limit: 1, offset: 0 });
      return result.projects[0]?.project ?? null;
    },
  });
}
