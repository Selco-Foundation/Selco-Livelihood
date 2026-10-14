import { describe, expect, it, vi } from "vitest";
import { translateOr } from "./translate-or";

describe("translateOr", () => {
  it("returns the translated value when the key resolves to something different from the key itself", () => {
    const t = vi.fn((key: string) => (key === "ES_HELLO" ? "Hello" : key));
    expect(translateOr(t, "ES_HELLO", "Fallback hello")).toBe("Hello");
  });

  it("returns the fallback when the translation function just echoes the key back", () => {
    const t = vi.fn((key: string) => key);
    expect(translateOr(t, "ES_MISSING_KEY", "Fallback text")).toBe("Fallback text");
  });
});
