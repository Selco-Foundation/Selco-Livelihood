import { describe, expect, it } from "vitest";
import { getViteEnv } from "./env";

// vi.stubEnv can't reach this: Vite bakes import.meta.env into each module as
// its own snapshot at transform time, so env.ts's copy never sees a later
// process.env mutation made from a different test file/module.
describe("getViteEnv", () => {
  it("returns the configured VITE_STATE_LEVEL_TENANT_ID value", () => {
    expect(getViteEnv("VITE_STATE_LEVEL_TENANT_ID")).toBe("livelihood");
  });

  it("prefers the real env value over a given fallback when the env value is set", () => {
    expect(getViteEnv("VITE_STATE_LEVEL_TENANT_ID", "fallback-tenant")).toBe("livelihood");
  });
});
