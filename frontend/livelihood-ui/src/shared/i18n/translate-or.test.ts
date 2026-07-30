import { describe, expect, it } from "vitest";
import { translateOr } from "./translate-or";

describe("translateOr", () => {
  it("returns the translated value when the key resolves to something other than itself", () => {
    const t = (key: string) => (key === "GREETING" ? "Hello" : key);

    expect(translateOr(t, "GREETING", "fallback")).toBe("Hello");
  });

  it("returns the fallback when i18next echoes the key back (its missing-translation convention)", () => {
    const t = (key: string) => key;

    expect(translateOr(t, "UNKNOWN_KEY", "Fallback Text")).toBe("Fallback Text");
  });
});
