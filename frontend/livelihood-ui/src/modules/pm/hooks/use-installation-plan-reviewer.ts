import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchAssignedReviewer } from "../services/installation-plan";

/** The reviewer assigned to an existing plan — not part of `useInstallationPlanById`'s own
 *  response, since the assignment lives in `field-planner-activity`, not `field-planner`. */
export function useInstallationPlanReviewer(fieldPlanId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["pm-installation-plan-reviewer", fieldPlanId],
    enabled: Boolean(fieldPlanId && accessToken),
    queryFn: () => searchAssignedReviewer(fieldPlanId!, accessToken!, user),
  });
}
