import { getViteEnv } from "../env";

export function getConfig(key: string): string | boolean | string[] | undefined {
  return window.globalConfigs?.getConfig(key);
}

export function getConfigString(key: string, fallback = ""): string {
  const value = getConfig(key);
  return typeof value === "string" ? value : fallback;
}

export function contextPath(): string {
  return getConfigString("CONTEXT_PATH", "livelihood-ui");
}

export function tenantId(envFallback?: string): string {
  return getConfigString(
    "STATE_LEVEL_TENANT_ID",
    envFallback ?? getViteEnv("VITE_STATE_LEVEL_TENANT_ID", "livelihood"),
  );
}

export function isGlobalConfigLoaded(): boolean {
  return typeof window.globalConfigs?.getConfig === "function";
}

export interface StateBoundaryLanguage {
  code: string;
  label: string;
  nativeLabel: string;
}

export interface StateBoundaryLanguageEntry {
  boundaryCode: string;
  languages: StateBoundaryLanguage[];
}

function normalizeStateBoundaryLanguage(raw: unknown): StateBoundaryLanguage | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.code !== "string" || typeof item.label !== "string") return null;
  const nativeLabel =
    typeof item.nativeLabel === "string" && item.nativeLabel.trim().length > 0
      ? item.nativeLabel
      : item.label;
  return { code: item.code, label: item.label, nativeLabel };
}

function normalizeStateBoundaryInfo(raw: unknown): StateBoundaryLanguageEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  if (typeof entry.boundaryCode !== "string" || !Array.isArray(entry.languages)) return null;
  const languages = entry.languages
    .map(normalizeStateBoundaryLanguage)
    .filter((language): language is StateBoundaryLanguage => language !== null);
  return { boundaryCode: entry.boundaryCode, languages };
}

// getStateBoundaryInfos is expected to already filter by the given boundaryCodes; this only
// validates and normalizes the shape of whatever it returns.
export function getStateBoundaryLanguages(boundaryCodes: string[]): StateBoundaryLanguageEntry[] {
  if (boundaryCodes.length === 0) return [];
  const raw = window.globalConfigs?.getStateBoundaryInfos?.(boundaryCodes);
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeStateBoundaryInfo)
    .filter((entry): entry is StateBoundaryLanguageEntry => entry !== null);
}
