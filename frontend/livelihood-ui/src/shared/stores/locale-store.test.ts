import { afterEach, describe, expect, it } from "vitest";
import { useLocaleStore } from "./locale-store";

const initialState = useLocaleStore.getState();

afterEach(() => {
  useLocaleStore.setState(initialState, true);
});

describe("useLocaleStore", () => {
  it("initializes locale from readActiveLocale", () => {
    expect(typeof useLocaleStore.getState().locale).toBe("string");
    expect(useLocaleStore.getState().locale.length).toBeGreaterThan(0);
  });

  describe("setLocale", () => {
    it("updates the locale", () => {
      useLocaleStore.getState().setLocale("hi_IN");

      expect(useLocaleStore.getState().locale).toBe("hi_IN");
    });
  });
});
