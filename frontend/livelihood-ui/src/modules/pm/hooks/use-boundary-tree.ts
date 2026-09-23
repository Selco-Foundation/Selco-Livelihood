import { fetchBoundaryRelations } from "@/shared/api/boundary";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useJurisdictionStore } from "@/shared/stores/jurisdiction-store";
import { aggregateBoundaryCodes } from "@/shared/utils/boundary-util";
import { useQuery } from "@tanstack/react-query";
import type { BoundaryHierarchy } from "../constants/boundary-data";
import { pmKeys } from "./query-keys";

/**
 * Real `/boundary-service` call, seeded from the logged-in employee's own jurisdiction (the same
 * pattern `InboxFilter`/`FacilityEntryListPage` already use for boundary-scoped lookups elsewhere
 * in the app). `fetchBoundaryRelations` only returns `{code, parentCode}` — no display name — so
 * the code is used as the name here, matching the same stand-in used in `buildProjectBoundaryTree`
 * until a real localization lookup is wired in (this doesn't affect correctness: the server
 * matches boundaries by code, never by name).
 */
export function useBoundaryTree() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const boundaries = useJurisdictionStore((state) => state.boundaries);
  const codes = aggregateBoundaryCodes(boundaries);
  const stableCodes = [...codes].sort().join(",");

  return useQuery<BoundaryHierarchy>({
    queryKey: pmKeys.boundaryTree(stableCodes),
    enabled: Boolean(accessToken) && codes.length > 0,
    queryFn: async () => {
      const raw = await fetchBoundaryRelations(codes, accessToken!, user);
      const districtToState = new Map((raw.districts ?? []).map((district) => [district.code, district.parentCode]));

      return {
        states: (raw.states ?? []).map((state) => ({ code: state.code, name: state.code })),
        districts: (raw.districts ?? []).map((district) => ({
          code: district.code,
          name: district.code,
          stateCode: district.parentCode,
        })),
        blocks: (raw.blocks ?? []).map((block) => ({
          code: block.code,
          name: block.code,
          districtCode: block.parentCode,
          stateCode: districtToState.get(block.parentCode) ?? "",
        })),
      };
    },
    staleTime: Infinity,
  });
}
