import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchFieldPlanFacilityCounts } from "../services/installation-scope";

/** `fieldPlanId -> included site count`, for a whole Installation Plans table at once — not part
 *  of any plan's own search response, since `field_plan_facilities` rows live outside
 *  field-planner's FieldPlan object (same reason as the wizard's own scope/reviewer/template
 *  reads). Query key includes the sorted id list so it recomputes when the visible plan set
 *  changes, but not on every unrelated re-render. */
export function useInstallationPlanFacilityCounts(fieldPlanIds: string[]) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const sortedIds = [...fieldPlanIds].sort();

  return useQuery({
    queryKey: ["pm-installation-plan-facility-counts", sortedIds],
    enabled: Boolean(accessToken) && sortedIds.length > 0,
    queryFn: () => searchFieldPlanFacilityCounts(sortedIds, accessToken!, user),
  });
}
