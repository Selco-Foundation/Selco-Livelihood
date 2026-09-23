import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchVendorOrgUsers } from "../services/vendor-registry";
import { pmKeys } from "./query-keys";

export function useVendorOrgUsers(organizationId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pmKeys.vendorOrgUsers(organizationId),
    enabled: Boolean(organizationId && accessToken),
    queryFn: () => searchVendorOrgUsers(tenantId(), organizationId!, accessToken!, user),
  });
}
