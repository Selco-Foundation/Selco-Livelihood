import { extractApiErrorMessage, tenantId, translateOr, useAuthStore, useTranslate } from "@/shared";
import { toast } from "@/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAssetVendorMapping, type UpdateAssetVendorMappingPayload } from "../services/asset";
import { FACILITY_ASSETS_QUERY_KEY } from "./use-facility-assets";

export function useUpdateAssetVendor() {
  const { t } = useTranslate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateAssetVendorMappingPayload) =>
      updateAssetVendorMapping(payload, tenantId(), accessToken!, user),
    onSuccess: () => {
      toast.success(translateOr(t, "ASSET_VENDOR_UPDATE_SUCCESS", "Mapped vendor updated"));
      void queryClient.invalidateQueries({ queryKey: [FACILITY_ASSETS_QUERY_KEY] });
    },
    onError: (error) => {
      toast.error(translateOr(t, "ASSET_VENDOR_UPDATE_FAILED", "Failed to update the mapped vendor"), {
        description:
          extractApiErrorMessage(error) ?? translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again."),
      });
    },
  });
}
