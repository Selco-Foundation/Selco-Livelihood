import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { fetchVendorOptions } from "../services/vendor";

/** One shared fetch for the whole Asset tab, not per row. */
export function useVendorOptions(boundaryCode: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["eu-vendor-options", boundaryCode],
    enabled: Boolean(accessToken) && Boolean(boundaryCode),
    queryFn: () => fetchVendorOptions(accessToken!, user, boundaryCode!),
  });
}
