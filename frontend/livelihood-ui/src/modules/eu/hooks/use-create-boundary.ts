import { reloadModule, tenantId, upsertLocalization, useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBoundary, createBoundaryRelationship } from "../services/boundary";
import { computeGeographyCodes } from "../utils/boundary-codes";
import { BOUNDARIES_QUERY_KEY } from "./use-boundaries";

export interface CreateBoundaryInput {
  state: string;
  district: string;
  block: string;
  isStateTextMode: boolean;
  isDistrictTextMode: boolean;
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

      async function createTier(name: string, code: string, boundaryType: "State" | "District" | "Block", parent: string) {
        await createBoundary({ tenantId: stateTenantId, code }, accessToken!, user);
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
