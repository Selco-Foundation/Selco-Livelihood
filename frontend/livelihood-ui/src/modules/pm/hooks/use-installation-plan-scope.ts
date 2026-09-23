import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchFieldPlanFacilities } from "../services/installation-scope";
import { pmKeys } from "./query-keys";

/** The plan's real Installation Scope entries — not part of `useInstallationPlanById`'s own
 *  response, since `field_plan_facilities` rows live outside `field-planner`'s FieldPlan object. */
export function useInstallationPlanScope(fieldPlanId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pmKeys.planScope(fieldPlanId),
    enabled: Boolean(fieldPlanId && accessToken),
    queryFn: () => searchFieldPlanFacilities(fieldPlanId!, accessToken!, user),
  });
}
