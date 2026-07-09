import { apiClient, tenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { SelectOption } from "../types/create-incident";
import type { ComplaintTypeOption, SystemFunctionalityOption } from "../types/inbox";

interface MdmsResponse {
  MdmsRes?: Record<string, Record<string, unknown[]>>;
}

interface ServiceDef {
  deprecated?: boolean;
  menuPath?: string;
  serviceCode?: string;
}

interface ItemCode {
  code?: string;
  category?: string;
  active?: boolean;
}

export async function fetchMdmsMasters(
  stateTenantId: string,
  moduleCode: string,
  masterNames: string[],
  accessToken: string,
  user?: AuthUser | null,
): Promise<Record<string, unknown[]>> {
  const { data } = await apiClient.post<MdmsResponse>(
    "/egov-mdms-service/v1/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      MdmsCriteria: {
        tenantId: stateTenantId,
        moduleDetails: [
          {
            moduleName: moduleCode,
            masterDetails: masterNames.map((name) => ({ name })),
          },
        ],
      },
    },
    {
      params: { tenantId: stateTenantId },
    },
  );

  return data.MdmsRes?.[moduleCode] ?? {};
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

export async function fetchAssetTypes(
  accessToken: string,
  user: AuthUser | null | undefined,
  t: (key: string) => string,
): Promise<SelectOption[]> {
  const stateTenantId = tenantId();
  const masters = await fetchMdmsMasters(
    stateTenantId,
    "livelihood",
    ["ItemCode"],
    accessToken,
    user,
  );
  const items = (masters.ItemCode as ItemCode[]) ?? [];
  const categories = new Map<string, string>();

  for (const item of items) {
    if (item.active === false || !item.category || categories.has(item.category)) {
      continue;
    }
    categories.set(item.category, t(`ASSETTYPE_${item.category}`));
  }

  return [...categories.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

export async function fetchComplaintSubTypes(
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
      name: t(`SERVICEDEFS.${(def.serviceCode ?? "").toUpperCase()}`),
    }));
}
