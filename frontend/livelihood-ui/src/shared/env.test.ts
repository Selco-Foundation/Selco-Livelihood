import { describe, expect, it } from "vitest";
import { getViteEnv } from "./env";

describe("getViteEnv", () => {
  it("returns the value from import.meta.env when the key is present", () => {
    // The repo's .env defines this for real, so it's genuinely present at test time.
    expect(getViteEnv("VITE_STATE_LEVEL_TENANT_ID")).toBe("livelihood");
  });

  it("returns the fallback when the key isn't set in the env", () => {
    // Cast: readViteEnv()[key] is a dynamic lookup, so an arbitrary unset
    // key exercises the missing-value branch without fighting Vite's
    // static inlining of known VITE_* keys referenced by literal name.
    expect(getViteEnv("VITE_NOT_A_REAL_KEY" as never, "default-tenant")).toBe(
      "default-tenant",
    );
  });

  it("defaults the fallback to an empty string when omitted", () => {
    expect(getViteEnv("VITE_NOT_A_REAL_KEY" as never)).toBe("");
  });
});
