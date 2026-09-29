import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchProjects } from "../services/project";
import { pmKeys } from "./query-keys";

export function useProjectById(projectId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pmKeys.project(projectId),
    enabled: Boolean(projectId && accessToken),
    queryFn: async () => {
      const result = await searchProjects(
        { criteria: { id: [projectId!] }, limit: 1, offset: 0 },
        accessToken ?? undefined,
        user,
      );
      return result.projects[0]?.project ?? null;
    },
  });
}
