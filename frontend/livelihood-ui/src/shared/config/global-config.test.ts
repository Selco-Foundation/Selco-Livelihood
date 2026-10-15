import { afterEach, describe, expect, it, vi } from "vitest";
import {
  contextPath,
  getConfig,
  getConfigString,
  isGlobalConfigLoaded,
  tenantId,
} from "./global-config";

afterEach(() => {
  window.globalConfigs = { getConfig: () => undefined };
});

describe("getConfig", () => {
  it("delegates to window.globalConfigs.getConfig", () => {
    window.globalConfigs = { getConfig: vi.fn().mockReturnValue("some-value") };
    expect(getConfig("SOME_KEY")).toBe("some-value");
    expect(window.globalConfigs.getConfig).toHaveBeenCalledWith("SOME_KEY");
  });

  it("returns undefined when window.globalConfigs is missing", () => {
    window.globalConfigs = undefined;
    expect(getConfig("SOME_KEY")).toBeUndefined();
  });
});

describe("getConfigString", () => {
  it("returns the config value when it is a string", () => {
    window.globalConfigs = { getConfig: () => "a-string" };
    expect(getConfigString("SOME_KEY")).toBe("a-string");
  });

  it("returns the fallback when the config value is not a string", () => {
    window.globalConfigs = { getConfig: () => true };
    expect(getConfigString("SOME_KEY", "fallback")).toBe("fallback");
  });

  it("defaults the fallback to an empty string", () => {
    window.globalConfigs = { getConfig: () => undefined };
    expect(getConfigString("SOME_KEY")).toBe("");
  });
});

describe("contextPath", () => {
  it("returns the configured CONTEXT_PATH", () => {
    window.globalConfigs = { getConfig: () => "custom-path" };
    expect(contextPath()).toBe("custom-path");
  });

  it("falls back to livelihood-ui when unset", () => {
    window.globalConfigs = { getConfig: () => undefined };
    expect(contextPath()).toBe("livelihood-ui");
  });
});

describe("tenantId", () => {
  it("returns the configured STATE_LEVEL_TENANT_ID", () => {
    window.globalConfigs = { getConfig: () => "configured-tenant" };
    expect(tenantId()).toBe("configured-tenant");
  });

  it("falls back to the given envFallback when unconfigured", () => {
    window.globalConfigs = { getConfig: () => undefined };
    expect(tenantId("explicit-fallback")).toBe("explicit-fallback");
  });

  it("falls back to the vite env value (VITE_STATE_LEVEL_TENANT_ID) when unconfigured and no envFallback is given", () => {
    window.globalConfigs = { getConfig: () => undefined };
    expect(tenantId()).toBe("livelihood");
  });
});

describe("isGlobalConfigLoaded", () => {
  it("returns true when getConfig is a function", () => {
    window.globalConfigs = { getConfig: () => undefined };
    expect(isGlobalConfigLoaded()).toBe(true);
  });

  it("returns false when window.globalConfigs is missing", () => {
    window.globalConfigs = undefined;
    expect(isGlobalConfigLoaded()).toBe(false);
  });
});
