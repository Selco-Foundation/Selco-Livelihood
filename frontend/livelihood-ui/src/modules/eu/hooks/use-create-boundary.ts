import { reloadModule, tenantId, upsertLocalization, useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBoundary, createBoundaryRelationship, fetchBoundaryLgdCodes } from "../services/boundary";
import { computeGeographyCodes } from "../utils/boundary-codes";
import { BOUNDARIES_QUERY_KEY } from "./use-boundaries";

export interface CreateBoundaryInput {
  state: string;
  district: string;
  block: string;
  isStateTextMode: boolean;
  isDistrictTextMode: boolean;
  lgdStateCode?: string;
  lgdDistrictCode?: string;
  lgdBlockCode?: string;
  lgdBlockTier?: string;
}

/**
 * Compute codes for whichever tiers were typed as free text, create each new
 * tier (boundary + relationship + a localized display name), then create the
 * block (always, since it's never picked from an existing list), and finally
 * bust the cached `rainmaker-livelihood` bundle so the new names render
 * immediately — boundary data lives in that module, not `rainmaker-eu`.
 */
export function useCreateBoundary() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const stateTenantId = tenantId();

  return useMutation({
    mutationFn: async (input: CreateBoundaryInput) => {
      const codes = computeGeographyCodes({
        country: "India",
        state: input.state,
        district: input.district,
        block: input.block,
        isStateTextMode: input.isStateTextMode,
        isDistrictTextMode: input.isDistrictTextMode,
      });

      // A typed state means a typed district too (there is nothing to pick under it).
      const newDistrict = input.isStateTextMode || input.isDistrictTextMode;
      // LGD codes travel down the hierarchy: a state or district picked from the list keeps
      // what it already stores, and the tiers created under it inherit that, so a new block
      // under an onboarded district carries the district's LGD codes without retyping them.
      const existing = await fetchBoundaryLgdCodes(
        [input.isStateTextMode ? "" : codes.state, newDistrict ? "" : codes.district],
        accessToken!,
        user,
      );
      const lgdState = input.isStateTextMode
        ? input.lgdStateCode
        : existing.get(codes.state)?.lgdStateCode ?? existing.get(codes.district)?.lgdStateCode;
      const lgdDistrict = newDistrict
        ? input.lgdDistrictCode
        : existing.get(codes.district)?.lgdDistrictCode;
      const tierLgd = {
        State: { lgdStateCode: lgdState },
        District: { lgdStateCode: lgdState, lgdDistrictCode: lgdDistrict },
        Block: {
          lgdStateCode: lgdState,
          lgdDistrictCode: lgdDistrict,
          lgdBlockCode: input.lgdBlockCode,
          lgdBlockTier: input.lgdBlockCode ? input.lgdBlockTier : undefined,
        },
      };

      async function createTier(name: string, code: string, boundaryType: "State" | "District" | "Block", parent: string) {
        await createBoundary({ tenantId: stateTenantId, code, ...tierLgd[boundaryType] }, accessToken!, user);
        await createBoundaryRelationship(
          { tenantId: stateTenantId, code, boundaryType, parent },
          accessToken!,
          user,
        );
        await upsertLocalization(
          {
            tenantId: stateTenantId,
            messages: [
              {
                code: `BOUNDARY_${code}`,
                message: name.trim().replace(/\s+/g, " "),
                module: "rainmaker-livelihood",
                locale: "en_IN",
              },
            ],
          },
          accessToken!,
          user,
        );
      }

      if (input.isStateTextMode) {
        await createTier(input.state, codes.state, "State", codes.country);
      }
      if (input.isDistrictTextMode) {
        await createTier(input.district, codes.district, "District", codes.state);
      }
      await createTier(input.block, codes.block, "Block", codes.district);

      await reloadModule("livelihood");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [BOUNDARIES_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ["boundary-hierarchy"] });
    },
  });
}
