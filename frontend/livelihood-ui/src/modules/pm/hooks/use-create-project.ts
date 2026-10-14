import { useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject, updateProject } from "../services/project";
import type { Project } from "../types/project";
import { pmKeys } from "./query-keys";

/** Creates a new project, or updates an existing one when `project.id` is
 *  already set (e.g. resuming the wizard at a later step). */
export function useSaveProject() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (project: Project) =>
      project.id
        ? updateProject(project, accessToken ?? undefined, user)
        : createProject(project, accessToken ?? undefined, user),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pmKeys.projects() });
    },
  });
}
