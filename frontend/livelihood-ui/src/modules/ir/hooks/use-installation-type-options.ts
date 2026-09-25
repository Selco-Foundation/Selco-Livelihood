import { fetchMdmsMasters, tenantId as getTenantId, translateOr, useAuthStore, useTranslate } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { COMPONENT_TYPE_LABELS } from "../constants/component-type";
import type { ActivityFilterOption } from "../components/activity/ActivityFilter";
import type { ActivityComponentType } from "../types/activity-review";

const INSTALLATION_TYPES_MODULE = "Installation";
const INSTALLATION_TYPES_MASTER = "InstallationTypes";

interface RawInstallationTypeOption {
  code?: string;
  name?: string;
}

/** MDMS `Installation.InstallationTypes` — {code, name} entries, mirroring
 * `Installation.RejectionReasons`'s shape. Label prefers the existing
 * ES_IR_COMPONENT_TYPE_* translation (same text the activity table's Type
 * column already shows) so the filter option and the table stay in sync;
 * falls back to the master's own `name` for a code that isn't one of the
 * two known component types yet. */
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
    .map((option) => {
      const label = COMPONENT_TYPE_LABELS[option.code as ActivityComponentType];
      return {
        code: option.code,
        name: label ? translateOr(t, label.key, label.fallback) : (option.name ?? option.code),
      };
    });

  return { options, isLoading };
}
