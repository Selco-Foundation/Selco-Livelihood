import { apiClient } from "./client";
import { createRequestInfo } from "./request-info";
import { tenantId } from "../config/global-config";
import type { AuthUser } from "../stores/auth-store";

interface MdmsResponse {
  MdmsRes?: Record<string, Record<string, unknown[]>>;
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

export interface InstallationSolution {
  code: string;
  name: string;
  sectorName: string;
  sunshineHrsMin?: number;
}

function isInstallationSolution(value: unknown): value is InstallationSolution {
  const record = value as Partial<InstallationSolution> | null;
  return Boolean(
    record && typeof record.code === "string" && typeof record.sectorName === "string",
  );
}

/**
 * `Installation.Solution` is the live MDMS master proven in the backend test runs (14 seeded
 * records, each carrying `sectorName`) — there is no separate `Installation.Sector` master, so
 * the set of sectors is derived by callers as the distinct `sectorName` values here rather than
 * fetched from its own schema.
 */
export async function fetchInstallationSolutions(
  stateTenantId: string,
  accessToken?: string,
  user?: AuthUser | null,
): Promise<InstallationSolution[]> {
  const masters = await fetchMdmsMasters(
    stateTenantId,
    "Installation",
    ["Solution"],
    accessToken,
    user,
  );
  const solutions = (masters.Solution as unknown[]) ?? [];

  return solutions.filter(isInstallationSolution);
}

export interface LoginBannerImage {
  image: string;
  title: string;
  discription: string;
}

function isLoginBannerImage(value: unknown): value is LoginBannerImage {
  const record = value as Partial<LoginBannerImage> | null;
  return Boolean(record && typeof record.image === "string");
}

export async function fetchLoginBannerImages(
  accessToken?: string,
  user?: AuthUser | null,
): Promise<LoginBannerImage[]> {
  const masters = await fetchMdmsMasters(
    tenantId(),
    "commonUiConfig",
    ["LoginBannerImages"],
    accessToken,
    user,
  );
  const images = (masters.LoginBannerImages as unknown[]) ?? [];

  return images.filter(isLoginBannerImage);
}
