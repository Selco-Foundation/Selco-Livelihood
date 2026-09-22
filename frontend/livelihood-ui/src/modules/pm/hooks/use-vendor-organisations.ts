import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchVendorOrganisations } from "../services/vendor-registry";

export function useVendorOrganisations() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["pm-vendor-organisations"],
    enabled: Boolean(accessToken),
    queryFn: () => searchVendorOrganisations(tenantId(), accessToken!, user),
  });
}
