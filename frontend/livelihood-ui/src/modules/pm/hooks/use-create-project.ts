import { useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject, updateProject, validateJustificationCode } from "../services/project";
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

/** Checks a new project's justification code and dates before the project is created, so a
 *  duplicate code is caught on the first wizard step. */
export function useValidateJustificationCode() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (project: Project) => validateJustificationCode(project, accessToken ?? undefined, user),
  });
}
