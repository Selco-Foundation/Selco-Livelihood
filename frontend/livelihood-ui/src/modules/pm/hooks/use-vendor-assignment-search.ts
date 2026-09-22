import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchVendorAssignment } from "../services/vendor-assignment";
import { pmKeys } from "./query-keys";

/** `enabled` defaults to true for the Technician Assignment step's own render-time use; the
 *  wizard page passes `currentStep === 4` so this doesn't fire from earlier steps just to
 *  precompute the Submit button's disabled state before it's reachable. Both call sites share
 *  the same query key, so once step 4 is reached this resolves from one request either way. */
export function useVendorAssignmentSearch(fieldPlanId: string | undefined, enabled = true) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pmKeys.planVendorAssignment(fieldPlanId),
    enabled: Boolean(fieldPlanId && accessToken && enabled),
    queryFn: () => searchVendorAssignment(fieldPlanId!, accessToken!, user),
  });
}
