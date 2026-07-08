import { apiClient } from "./client";
import { createRequestInfo } from "./request-info";
import { tenantId } from "../config/global-config";
import type { AuthUser } from "../stores/auth-store";
import type {
  ComplaintTypeOption,
  SystemFunctionalityOption,
} from "@/modules/im/types/inbox";

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
  accessToken?: string,
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

export interface SupportedLanguage {
  code: string;
  label: string;
  nativeLabel: string;
}

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  const record = value as Partial<SupportedLanguage> | null;
  return Boolean(record && typeof record.code === "string" && typeof record.label === "string");
}

export async function fetchLanguages(
  accessToken?: string,
  user?: AuthUser | null,
): Promise<SupportedLanguage[]> {
  const masters = await fetchMdmsMasters(
    tenantId(),
    "common-masters",
    ["Languages"],
    accessToken,
    user,
  );
  const languages = (masters.Languages as unknown[]) ?? [];

  return languages.filter(isSupportedLanguage).map((language) => ({
    code: language.code,
    label: language.label,
    nativeLabel: language.nativeLabel ?? language.label,
  }));
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
