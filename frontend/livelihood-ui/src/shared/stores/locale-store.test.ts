import { describe, expect, it } from "vitest";
import { useLocaleStore } from "./locale-store";

describe("useLocaleStore", () => {
  it("initializes locale from readActiveLocale() at module load", () => {
    expect(typeof useLocaleStore.getState().locale).toBe("string");
    expect(useLocaleStore.getState().locale.length).toBeGreaterThan(0);
  });

  it("updates the locale via setLocale", () => {
    useLocaleStore.getState().setLocale("kn_IN");
    expect(useLocaleStore.getState().locale).toBe("kn_IN");
  });
});
