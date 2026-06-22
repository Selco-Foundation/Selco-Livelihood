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
    envFallback ?? getViteEnv("VITE_STATE_LEVEL_TENANT_ID", "in"),
  );
}

export function isGlobalConfigLoaded(): boolean {
  return typeof window.globalConfigs?.getConfig === "function";
}
