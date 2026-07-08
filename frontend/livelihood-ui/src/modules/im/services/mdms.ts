import { fetchMdmsMasters, tenantId, type AuthUser } from "@/shared";
import type { ComplaintTypeOption, SystemFunctionalityOption } from "../types/inbox";

interface ServiceDef {
  deprecated?: boolean;
  menuPath?: string;
  serviceCode?: string;
}

export async function fetchSystemFunctionality(
  accessToken: string,
  user?: AuthUser | null,
): Promise<SystemFunctionalityOption[]> {
  const stateTenantId = tenantId();
  const masters = await fetchMdmsMasters(
    stateTenantId,
    "Incident",
    ["SystemFunctionality"],
    accessToken,
    user,
  );
  return (masters.SystemFunctionality as SystemFunctionalityOption[]) ?? [];
}

export async function fetchComplaintTypes(
  accessToken: string,
  user: AuthUser | null | undefined,
  t: (key: string) => string,
): Promise<ComplaintTypeOption[]> {
  const stateTenantId = tenantId();
  const masters = await fetchMdmsMasters(
    stateTenantId,
    "Incident",
    ["ServiceDefs"],
    accessToken,
    user,
  );
  const serviceDefs = (masters.ServiceDefs as ServiceDef[]) ?? [];
  const menu: ComplaintTypeOption[] = [];
  const seen = new Set<string>();

  for (const def of serviceDefs) {
    if (def.deprecated) {
      continue;
    }
    const serviceCode = def.serviceCode ?? "";
    if (!serviceCode || seen.has(serviceCode)) {
      continue;
    }
    seen.add(serviceCode);
    menu.push({
      key: serviceCode,
      serviceCode,
      menuPath: def.menuPath,
      name: t(`SERVICEDEFS.${serviceCode.toUpperCase()}`),
    });
  }

  return menu;
}

export async function fetchServiceDefsForMenuPath(
  accessToken: string,
  user: AuthUser | null | undefined,
  menuPath: string,
  t: (key: string) => string,
): Promise<ComplaintTypeOption[]> {
  const stateTenantId = tenantId();
  const masters = await fetchMdmsMasters(
    stateTenantId,
    "Incident",
    ["ServiceDefs"],
    accessToken,
    user,
  );
  const serviceDefs = (masters.ServiceDefs as ServiceDef[]) ?? [];

  return serviceDefs
    .filter((def) => !def.deprecated && def.menuPath === menuPath)
    .map((def) => ({
      key: def.serviceCode ?? "",
      serviceCode: def.serviceCode,
      menuPath: def.menuPath,
      name: t(`SERVICEDEFS.${(def.serviceCode ?? "").toUpperCase()}`),
    }))
    .filter((item) => item.key)
    .sort((a, b) => a.name.localeCompare(b.name));
}
