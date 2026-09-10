import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject, updateProject } from "../services/project";
import type { Project } from "../types/project";

/** Creates a new project, or updates an existing one when `project.id` is
 *  already set (e.g. resuming the wizard at a later step). */
export function useSaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (project: Project) => (project.id ? updateProject(project) : createProject(project)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pm-projects"] });
    },
  });
}
