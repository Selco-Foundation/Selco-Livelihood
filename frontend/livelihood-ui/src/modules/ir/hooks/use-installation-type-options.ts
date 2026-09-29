import { fetchMdmsMasters, tenantId as getTenantId, translateOr, useAuthStore, useTranslate } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import type { ActivityFilterOption } from "../components/activity/ActivityFilter";

const INSTALLATION_TYPES_MODULE = "Installation";
const INSTALLATION_TYPES_MASTER = "InstallationTypes";

interface RawInstallationTypeOption {
  code?: string;
  name?: string;
}

/** MDMS `Installation.InstallationTypes` — {code, name} entries, mirroring
 * `Installation.RejectionReasons`'s shape. The whole point of this being an
 * MDMS master is that a new type is configurable from MDMS alone, so the
 * label isn't a hardcoded code→text map: it's ES_IR_COMPONENT_TYPE_<CODE>
 * (same key the activity table's Type column builds from
 * ReviewActivity.componentType, so a translated label stays in sync between
 * the two once staged), falling back to the master's own `name` — which,
 * unlike the table, this hook always has — for a code that doesn't have a
 * translation staged yet. */
export function useInstallationTypeOptions() {
  const { t } = useTranslate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const tenantId = employeeTenantId || getTenantId();

  const { data, isLoading } = useQuery({
    queryKey: ["ir-installation-type-options", tenantId],
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
    queryFn: () =>
      fetchMdmsMasters(
        tenantId,
        INSTALLATION_TYPES_MODULE,
        [INSTALLATION_TYPES_MASTER],
        accessToken!,
        user,
      ),
  });

  const raw = (data?.InstallationTypes as RawInstallationTypeOption[] | undefined) ?? [];

  const options: ActivityFilterOption[] = raw
    .filter((option): option is RawInstallationTypeOption & { code: string } => Boolean(option.code))
    .map((option) => ({
      code: option.code,
      name: translateOr(t, `ES_IR_COMPONENT_TYPE_${option.code}`, option.name ?? option.code),
    }));

  return { options, isLoading };
}
