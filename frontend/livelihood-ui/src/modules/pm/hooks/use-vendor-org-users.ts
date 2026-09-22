import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchVendorOrgUsers } from "../services/vendor-registry";

export function useVendorOrgUsers(organizationId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["pm-vendor-org-users", organizationId],
    enabled: Boolean(organizationId && accessToken),
    queryFn: () => searchVendorOrgUsers(tenantId(), organizationId!, accessToken!, user),
  });
}
