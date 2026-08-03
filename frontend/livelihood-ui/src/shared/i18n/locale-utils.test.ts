/**
 * Unit tests for locale utility functions in src/shared/i18n/locale-utils.ts
 *
 * Covers: 19 pure functions that transform locale codes, tenant names, and i18n keys.
 * These functions handle:
 * - Locale composition/normalization (getDefaultLanguage, normalizeLocale, etc.)
 * - Tenant ID transformation (toTenantLocale, toTenantLocale, etc.)
 * - i18n key building from values and namespaces (convertToLocale, getMohallaLocale, etc.)
 * - Dropdown data enrichment and sorting (convertToLocaleData, sortDropdownNames)
 * - Module namespace mapping (namespaceToDigitModule, getDefaultLocalizationModules)
 *
 * Approach: Direct function calls with global config mocking.
 * No provider wrapper needed; all functions are pure or rely only on window.globalConfigs.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  checkForNotNull,
  convertDotValues,
  convertToLocale,
  convertToLocaleData,
  getCityLocale,
  getDefaultLanguage,
  getDefaultLocalizationModules,
  getLocaleDefault,
  getLocaleRegion,
  getLocalityCode,
  getMohallaLocale,
  getRevenueLocalityCode,
  getTransformedLocale,
  namespaceToDigitModule,
  normalizeLocale,
  sortDropdownNames,
  stringReplaceAll,
  toTenantLocale,
} from "./locale-utils";

afterEach(() => {
  window.globalConfigs = { getConfig: () => undefined };
});

describe("getLocaleRegion / getLocaleDefault / getDefaultLanguage", () => {
  /**
   * These functions read locale region and language default from global config,
   * falling back to "IN" and "en" respectively. getDefaultLanguage() combines
   * both into a single language tag (e.g., "en_IN", "kn_KA").
   */
  it("fall back to IN/en when no global config is set", () => {
    expect(getLocaleRegion()).toBe("IN");
    expect(getLocaleDefault()).toBe("en");
    expect(getDefaultLanguage()).toBe("en_IN");
  });

  it("uses the configured region/default when global config provides them", () => {
    window.globalConfigs = {
      getConfig: (key) =>
        key === "LOCALE_REGION" ? "KA" : key === "LOCALE_DEFAULT" ? "kn" : undefined,
    };
    expect(getDefaultLanguage()).toBe("kn_KA");
  });
});

describe("normalizeLocale", () => {
  /**
   * Ensures a locale code includes the region (from config).
   * Appends it if missing, otherwise leaves the locale as-is.
   */
  it("appends the region when the locale doesn't already include it", () => {
    expect(normalizeLocale("en")).toBe("en_IN");
  });

  it("leaves the locale untouched when it already includes the region", () => {
    expect(normalizeLocale("en_IN")).toBe("en_IN");
  });
});

describe("toTenantLocale", () => {
  /**
   * Transforms a dot-delimited tenant ID (e.g., "livelihood.selco") into an
   * i18n-friendly format: underscores + uppercase ("LIVELIHOOD_SELCO").
   */
  it("replaces dots with underscores and upper-cases", () => {
    expect(toTenantLocale("livelihood.selco")).toBe("LIVELIHOOD_SELCO");
  });
});

describe("checkForNotNull", () => {
  /**
   * Checks if a string is non-empty and not undefined.
   * Used as a guard before locale/value transformations.
   */
  it("returns false for an empty string / undefined", () => {
    expect(checkForNotNull("")).toBe(false);
    expect(checkForNotNull(undefined)).toBe(false);
  });

  it("returns true for a non-empty string", () => {
    expect(checkForNotNull("value")).toBe(true);
  });
});

describe("stringReplaceAll", () => {
  /**
   * Replaces all occurrences of a substring (uses replaceAll where available, falls back
   * to a loop-based approach for older environments). Includes guard against infinite loops
   * when the searcher is an empty string.
   */
  it("replaces every occurrence of the searcher", () => {
    expect(stringReplaceAll("a.b.c", ".", "_")).toBe("a_b_c");
  });

  it("returns the original string unchanged when searcher is empty (infinite-loop guard)", () => {
    expect(stringReplaceAll("abc", "", "_")).toBe("abc");
  });

  it("defaults to empty strings when arguments are omitted", () => {
    expect(stringReplaceAll()).toBe("");
  });
});

describe("convertDotValues", () => {
  /**
   * Converts a dot-delimited value to underscores (e.g., "foo.bar" -> "foo_bar").
   * Returns "NA" for empty/null values as a sentinel for missing data.
   */
  it("returns NA for an empty value", () => {
    expect(convertDotValues("")).toBe("NA");
  });

  it("replaces dots with underscores for a real value", () => {
    expect(convertDotValues("foo.bar")).toBe("foo_bar");
  });
});

describe("convertToLocale", () => {
  /**
   * Builds an i18n key by combining a prefix and upper-cased value:
   * e.g., convertToLocale("foo.bar", "KEY") -> "KEY_FOO_BAR".
   * Returns "COMMON_NA" sentinel when the value is empty.
   */
  it("returns COMMON_NA when the value is empty", () => {
    expect(convertToLocale("", "KEY")).toBe("COMMON_NA");
  });

  it("builds a KEY_VALUE locale string, upper-cased", () => {
    expect(convertToLocale("foo.bar", "KEY")).toBe("KEY_FOO_BAR");
  });
});

describe("getMohallaLocale", () => {
  /**
   * Builds a revenue-scoped i18n key for a mohalla (neighborhood) value.
   * Format: TENANT_REVENUE_VALUE (e.g., "MY_TENANT_REVENUE_MOHALLA_ONE").
   * Returns "COMMON_NA" if tenant or value is empty.
   */
  it("returns COMMON_NA when the tenant converts to NA", () => {
    expect(getMohallaLocale("value", "")).toBe("COMMON_NA");
  });

  it("returns COMMON_NA when the value is empty", () => {
    expect(getMohallaLocale("", "tenant")).toBe("COMMON_NA");
  });

  it("builds a TENANT_REVENUE_VALUE locale string", () => {
    expect(getMohallaLocale("mohalla.one", "my.tenant")).toBe(
      "MY_TENANT_REVENUE_MOHALLA_ONE",
    );
  });
});

describe("getCityLocale", () => {
  /**
   * Builds a tenant-scoped i18n key for a city value.
   * Format: TENANT_TENANTS_VALUE (e.g., "TENANT_TENANTS_MY_CITY").
   * Returns "COMMON_NA" if the value is empty.
   */
  it("returns COMMON_NA when the value is empty", () => {
    expect(getCityLocale("")).toBe("COMMON_NA");
  });

  it("builds a TENANT_TENANTS_VALUE locale string", () => {
    expect(getCityLocale("my.city")).toBe("TENANT_TENANTS_MY_CITY");
  });
});

describe("getLocalityCode", () => {
  /**
   * Formats a locality code (admin/ward) string or object with tenant scope.
   * If the code already contains an underscore, it's treated as pre-formatted and returned as-is.
   * Otherwise, prefixes with TENANT_ADMIN_. Accepts string or {code: string} object.
   * Returns "COMMON_NA" if object has no code.
   */
  it("returns the string as-is when it already contains an underscore", () => {
    expect(getLocalityCode("ADMIN_FOO", "tenant")).toBe("ADMIN_FOO");
  });

  it("prefixes a plain string locality with the tenant/admin scope", () => {
    expect(getLocalityCode("FOO", "my.tenant")).toBe("MY_TENANT_ADMIN_FOO");
  });

  it("uses the .code field when given an object", () => {
    expect(getLocalityCode({ code: "FOO" }, "my.tenant")).toBe("MY_TENANT_ADMIN_FOO");
  });

  it("returns the object's code unchanged when it already has an underscore", () => {
    expect(getLocalityCode({ code: "ADMIN_FOO" }, "tenant")).toBe("ADMIN_FOO");
  });

  it("returns COMMON_NA when given an object without a code", () => {
    expect(getLocalityCode({}, "tenant")).toBe("COMMON_NA");
  });
});

describe("getRevenueLocalityCode", () => {
  /**
   * Formats a revenue/village locality code with tenant scope.
   * If the code already contains an underscore, it's treated as pre-formatted and returned as-is.
   * Otherwise, prefixes with TENANT_REVENUE_. Accepts string or {code: string} object.
   * Returns "COMMON_NA" if object has no code.
   */
  it("returns the string as-is when it already contains an underscore", () => {
    expect(getRevenueLocalityCode("REVENUE_FOO", "tenant")).toBe("REVENUE_FOO");
  });

  it("prefixes a plain string locality with the tenant/revenue scope", () => {
    expect(getRevenueLocalityCode("FOO", "my.tenant")).toBe("MY_TENANT_REVENUE_FOO");
  });

  it("uses the .code field when given an object", () => {
    expect(getRevenueLocalityCode({ code: "FOO" }, "my.tenant")).toBe(
      "MY_TENANT_REVENUE_FOO",
    );
  });

  it("returns COMMON_NA when given an object without a code", () => {
    expect(getRevenueLocalityCode({}, "tenant")).toBe("COMMON_NA");
  });
});

describe("getTransformedLocale", () => {
  /**
   * Normalizes a label for i18n use: numbers pass through, strings are trimmed,
   * upper-cased, and have punctuation (dots, colons, hyphens, slashes) replaced with underscores.
   * Returns empty string for undefined/empty input.
   */
  it("passes numbers through unchanged", () => {
    expect(getTransformedLocale(42)).toBe(42);
  });

  it("returns an empty string for undefined/blank labels", () => {
    expect(getTransformedLocale(undefined)).toBe("");
    expect(getTransformedLocale("   ")).toBe("");
  });

  it("trims, upper-cases, and replaces punctuation with underscores", () => {
    expect(getTransformedLocale(" foo-bar:baz/qux ")).toBe("FOO_BAR_BAZ_QUX");
  });
});

describe("convertToLocaleData", () => {
  /**
   * Enriches an array of objects (e.g., dropdown options) with an i18text field
   * derived from their code and a KEY prefix. Optionally applies a translator function
   * (e.g., react-i18next's t) to the resulting key.
   */
  it("attaches an i18text field derived from the code", () => {
    expect(convertToLocaleData([{ code: "foo" }], "KEY")).toEqual([
      { code: "foo", i18text: "KEY_FOO" },
    ]);
  });

  it("applies the translator function when provided", () => {
    const t = (code: string) => `translated:${code}`;
    expect(convertToLocaleData([{ code: "foo" }], "KEY", t)).toEqual([
      { code: "foo", i18text: "translated:KEY_FOO" },
    ]);
  });

  it("defaults to an empty array", () => {
    expect(convertToLocaleData()).toEqual([]);
  });
});

describe("sortDropdownNames", () => {
  /**
   * Sorts an array of dropdown options by the translated value of a specified key field.
   * Creates a new sorted copy without mutating the original array.
   */
  it("sorts options by the translated value of the option key", () => {
    const t = (code: string) => code;
    const options = [{ i18nKey: "Zebra" }, { i18nKey: "Apple" }];
    expect(sortDropdownNames(options, "i18nKey", t)).toEqual([
      { i18nKey: "Apple" },
      { i18nKey: "Zebra" },
    ]);
  });

  it("does not mutate the original array", () => {
    const t = (code: string) => code;
    const options = [{ i18nKey: "Zebra" }, { i18nKey: "Apple" }];
    sortDropdownNames(options, "i18nKey", t);
    expect(options[0].i18nKey).toBe("Zebra");
  });
});

describe("namespaceToDigitModule", () => {
  /**
   * Maps i18n namespace codes to DIGIT localization module names.
   * "common" and "translations" -> "rainmaker-common"
   * "state" -> "rainmaker-{stateTenant}" (e.g., "rainmaker-livelihood")
   * Existing "rainmaker-*" prefixed namespaces pass through unchanged.
   * Other namespaces get "rainmaker-" prefix added.
   */
  it("maps common/translations to rainmaker-common", () => {
    expect(namespaceToDigitModule("common", "tenant")).toBe("rainmaker-common");
    expect(namespaceToDigitModule("translations", "tenant")).toBe("rainmaker-common");
  });

  it("passes through namespaces already prefixed with rainmaker-", () => {
    expect(namespaceToDigitModule("rainmaker-im", "tenant")).toBe("rainmaker-im");
  });

  it("builds a state-tenant module for the 'state' namespace", () => {
    expect(namespaceToDigitModule("state", "LIVELIHOOD")).toBe("rainmaker-livelihood");
  });

  it("prefixes any other namespace with rainmaker-", () => {
    expect(namespaceToDigitModule("IM", "tenant")).toBe("rainmaker-im");
  });
});

describe("getDefaultLocalizationModules", () => {
  /**
   * Returns the standard set of i18n modules to load on app initialization:
   * always rainmaker-common (shared UI strings) plus a state-tenant-specific module
   * derived from stateTenantId (e.g., "LIVELIHOOD" -> "rainmaker-livelihood").
   */
  it("returns rainmaker-common plus the state-specific module", () => {
    expect(getDefaultLocalizationModules("LIVELIHOOD")).toEqual([
      "rainmaker-common",
      "rainmaker-livelihood",
    ]);
  });
});
