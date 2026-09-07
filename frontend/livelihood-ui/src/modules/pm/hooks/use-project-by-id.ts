import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared";
import { searchProjects } from "../services/project";

export function useProjectById(projectId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["pm-project", projectId],
    enabled: Boolean(accessToken && projectId),
    queryFn: async () => {
      const { projects } = await searchProjects({
        criteria: { id: [projectId!] },
        limit: 1,
        offset: 0,
        accessToken: accessToken!,
        user,
      });
      return projects[0];
    },
  });
}
