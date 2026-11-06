import { fetchMdmsMasters, tenantId as getTenantId, useAuthStore, type AuthUser } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { mapJustificationCodePrefix } from "../utils/justification-code-prefix-mapping";

const JUSTIFICATION_CODE_PREFIX_MODULE = "HCM-PROJECT-TYPES";
const JUSTIFICATION_CODE_PREFIX_MASTER = "JustificationCodePrefix";

export function fetchJustificationCodePrefixQuery(
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
) {
  return async () => {
    const masters = await fetchMdmsMasters(
      tenantId,
      JUSTIFICATION_CODE_PREFIX_MODULE,
      [JUSTIFICATION_CODE_PREFIX_MASTER],
      accessToken,
      user,
    );
    return mapJustificationCodePrefix(masters);
  };
}

/** The fixed, non-editable prefix shown before the Justification Code input
 * (e.g. "JUS"), sourced from MDMS rather than hardcoded. Falls back to a
 * display-only default while loading or if the master is unreachable — see
 * `justification-code-prefix-mapping.ts`. */
export function useJustificationCodePrefix() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const tenantId = employeeTenantId || getTenantId();

  return useQuery({
    queryKey: ["justification-code-prefix", tenantId],
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
    queryFn: fetchJustificationCodePrefixQuery(tenantId, accessToken!, user),
  });
}
