import { extractApiErrorMessage, tenantId, translateOr, useAuthStore, useTranslate } from "@/shared";
import { toast } from "@/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAmcFieldStaff } from "../services/amc";
import { FACILITY_AMCS_QUERY_KEY } from "./use-facility-amcs";

export interface AmcFieldStaffChange {
  activityFacilityId: string;
  fieldStaffUserId: string;
  vendorOrgId: string;
}

/** Moves a running AMC to a new field staff (and organisation). Errors show a toast; success is left to the caller. */
export function useUpdateAmcFieldStaff() {
  const { t } = useTranslate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (change: AmcFieldStaffChange) => updateAmcFieldStaff([{ tenantId: tenantId(), ...change }], accessToken!, user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [FACILITY_AMCS_QUERY_KEY] }),
    onError: (error) => {
      toast.error(translateOr(t, "ASSET_AMC_FIELD_STAFF_UPDATE_FAILED", "Could not change the AMC field staff"), {
        description:
          extractApiErrorMessage(error) ?? translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again."),
      });
    },
  });
}
