import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchOrgUsers } from "../services/vendor-registry";
import { toAmcFieldStaffOptions } from "../utils/amc-field-staff";
import { pmKeys } from "./query-keys";

/** AMC field staff the PM can pick for a vendor organisation: its members who hold AMC_FIELD_STAFF. */
export function useAmcFieldStaffOptions(organizationId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pmKeys.amcFieldStaff(organizationId),
    enabled: Boolean(organizationId && accessToken),
    queryFn: () => searchOrgUsers(tenantId(), organizationId!, accessToken!, user),
    select: toAmcFieldStaffOptions,
  });
}
