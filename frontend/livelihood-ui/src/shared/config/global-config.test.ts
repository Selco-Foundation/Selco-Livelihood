/**
 * Unit tests for global config accessors (src/shared/config/global-config.ts).
 *
 * This module wraps `window.globalConfigs.getConfig` (a runtime config provider
 * typically loaded from a server-side config endpoint) and offers four exported
 * helpers: `getConfig` (raw lookup), `getConfigString` (type-guarded string with
 * fallback), `contextPath` (gets CONTEXT_PATH or defaults to "livelihood-ui"),
 * `tenantId` (gets STATE_LEVEL_TENANT_ID or falls back to env/provided value),
 * and `isGlobalConfigLoaded` (checks if the provider function exists).
 *
 * Testing approach: Pure functions with no side effects. Tests verify proper
 * delegation to window.globalConfigs.getConfig, type guards (rejecting non-string
 * values like booleans or arrays), default fallback behavior, and the safety
 * check for window.globalConfigs being undefined. Each test stubs window.globalConfigs
 * to control the return value. After each test, globalConfigs is reset to prevent
 * test leakage (afterEach hook).
 */
import { afterEach, describe, expect, it } from "vitest";
import { contextPath, getConfig, getConfigString, isGlobalConfigLoaded, tenantId } from "./global-config";

afterEach(() => {
  window.globalConfigs = { getConfig: () => undefined };
});

// getConfig(key) safely reads from window.globalConfigs.getConfig, returning
// the value as-is (string, boolean, array, or undefined) or undefined if
// globalConfigs is absent.
describe("getConfig", () => {
  it("returns undefined when globalConfigs is absent", () => {
    window.globalConfigs = undefined;
    expect(getConfig("ANY_KEY")).toBeUndefined();
  });

  it("delegates to window.globalConfigs.getConfig", () => {
    window.globalConfigs = { getConfig: (key) => (key === "FOO" ? "bar" : undefined) };
    expect(getConfig("FOO")).toBe("bar");
  });
});

// getConfigString(key, fallback?) reads from getConfig and returns the value
// only if it is a string; otherwise returns the fallback (or empty string if
// no fallback provided). Rejects booleans, arrays, and other non-string types.
describe("getConfigString", () => {
  it("returns the fallback when the config value isn't a string (e.g. boolean)", () => {
    window.globalConfigs = { getConfig: () => true };
    expect(getConfigString("FOO", "fallback")).toBe("fallback");
  });

  it("returns the fallback when the config value is a string array", () => {
    window.globalConfigs = { getConfig: () => ["a", "b"] };
    expect(getConfigString("FOO", "fallback")).toBe("fallback");
  });

  it("returns the string value as-is when the config provides one", () => {
    window.globalConfigs = { getConfig: () => "actual-value" };
    expect(getConfigString("FOO", "fallback")).toBe("actual-value");
  });

  it("defaults the fallback to an empty string", () => {
    expect(getConfigString("FOO")).toBe("");
  });
});

// contextPath() reads CONTEXT_PATH from getConfigString and defaults to
// "livelihood-ui" if the config key is absent or not a string.
describe("contextPath", () => {
  it("falls back to livelihood-ui when not configured", () => {
    expect(contextPath()).toBe("livelihood-ui");
  });

  it("uses the configured CONTEXT_PATH", () => {
    window.globalConfigs = { getConfig: (key) => (key === "CONTEXT_PATH" ? "custom" : undefined) };
    expect(contextPath()).toBe("custom");
  });
});

// tenantId(envFallback?) reads STATE_LEVEL_TENANT_ID from getConfigString,
// falling back to the provided envFallback argument, then to the VITE_STATE_LEVEL_TENANT_ID
// env value (loaded at build time), then to "livelihood" as the ultimate default.
describe("tenantId", () => {
  it("uses the configured STATE_LEVEL_TENANT_ID when present", () => {
    window.globalConfigs = {
      getConfig: (key) => (key === "STATE_LEVEL_TENANT_ID" ? "configured-tenant" : undefined),
    };
    expect(tenantId()).toBe("configured-tenant");
  });

  it("falls back to the explicit envFallback argument when config is absent", () => {
    expect(tenantId("explicit-fallback")).toBe("explicit-fallback");
  });

  it("falls back to the VITE_STATE_LEVEL_TENANT_ID env value when config and envFallback are absent", () => {
    // The repo's .env sets VITE_STATE_LEVEL_TENANT_ID=livelihood for real.
    expect(tenantId()).toBe("livelihood");
  });
});

// isGlobalConfigLoaded() returns true if window.globalConfigs.getConfig is
// a function, false otherwise (e.g., if globalConfigs is absent or getConfig
// is not a function).
describe("isGlobalConfigLoaded", () => {
  it("returns false when globalConfigs is absent", () => {
    window.globalConfigs = undefined;
    expect(isGlobalConfigLoaded()).toBe(false);
  });

  it("returns true when globalConfigs.getConfig is a function", () => {
    window.globalConfigs = { getConfig: () => undefined };
    expect(isGlobalConfigLoaded()).toBe(true);
  });
});
