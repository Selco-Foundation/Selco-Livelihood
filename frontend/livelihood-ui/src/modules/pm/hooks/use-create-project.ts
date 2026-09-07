import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/shared";
import { createProject, updateProject } from "../services/project";
import type { Project } from "../types/project";

export function useSaveProject() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (project: Project) =>
      project.id
        ? updateProject(project, accessToken!, user)
        : createProject(project, accessToken!, user),
  });
}
