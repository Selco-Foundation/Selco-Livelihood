import { afterEach, describe, expect, it } from "vitest";
import { contextPath, getConfig, getConfigString, isGlobalConfigLoaded, tenantId } from "./global-config";

afterEach(() => {
  window.globalConfigs = { getConfig: () => undefined };
});

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

describe("contextPath", () => {
  it("falls back to livelihood-ui when not configured", () => {
    expect(contextPath()).toBe("livelihood-ui");
  });

  it("uses the configured CONTEXT_PATH", () => {
    window.globalConfigs = { getConfig: (key) => (key === "CONTEXT_PATH" ? "custom" : undefined) };
    expect(contextPath()).toBe("custom");
  });
});

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
