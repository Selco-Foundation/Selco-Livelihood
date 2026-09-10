import { fetchMdmsMasters, tenantId as getTenantId, useAuthStore, type AuthUser } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { mapInstallationImageCriteria } from "../utils/installation-image-mapping";

const INSTALLATION_IMAGES_MODULE = "common-masters";
const INSTALLATION_IMAGES_MASTER = "InstallationImages";

export function installationImageCriteriaQueryKey(tenantId: string) {
  return ["ir-installation-image-criteria", tenantId];
}

/** Shared by useFacilityReview (via queryClient.fetchQuery, same key) so the
 * master is only actually fetched once and cached across every review page
 * visit, not re-fetched per entry. */
export function fetchInstallationImageCriteriaQuery(
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
) {
  return async () => {
    const masters = await fetchMdmsMasters(
      tenantId,
      INSTALLATION_IMAGES_MODULE,
      [INSTALLATION_IMAGES_MASTER],
      accessToken,
      user,
    );
    return mapInstallationImageCriteria(masters);
  };
}

export function useInstallationImageCriteria() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const tenantId = employeeTenantId || getTenantId();

  return useQuery({
    queryKey: installationImageCriteriaQueryKey(tenantId),
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
    queryFn: fetchInstallationImageCriteriaQuery(tenantId, accessToken!, user),
  });
}
