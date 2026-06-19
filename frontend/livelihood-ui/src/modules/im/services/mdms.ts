import { apiClient, tenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { ComplaintTypeOption, SystemFunctionalityOption } from "../types/inbox";

interface MdmsResponse {
  MdmsRes?: Record<string, Record<string, unknown[]>>;
}

interface ServiceDef {
  deprecated?: boolean;
  menuPath?: string;
  serviceCode?: string;
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

  for (const def of serviceDefs) {
    if (def.deprecated) {
      continue;
    }
    const menuPath = def.menuPath ?? "";
    if (menu.some((item) => item.key === menuPath)) {
      continue;
    }
    menu.push({
      key: menuPath,
      name:
        menuPath === ""
          ? t("SERVICEDEFS.OTHERS")
          : t(`SERVICEDEFS.${menuPath.toUpperCase()}`),
    });
  }

  return menu;
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
