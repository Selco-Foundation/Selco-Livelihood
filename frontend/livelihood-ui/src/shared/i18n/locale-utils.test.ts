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
  it("appends the region when the locale doesn't already include it", () => {
    expect(normalizeLocale("en")).toBe("en_IN");
  });

  it("leaves the locale untouched when it already includes the region", () => {
    expect(normalizeLocale("en_IN")).toBe("en_IN");
  });
});

describe("toTenantLocale", () => {
  it("replaces dots with underscores and upper-cases", () => {
    expect(toTenantLocale("livelihood.selco")).toBe("LIVELIHOOD_SELCO");
  });
});

describe("checkForNotNull", () => {
  it("returns false for an empty string / undefined", () => {
    expect(checkForNotNull("")).toBe(false);
    expect(checkForNotNull(undefined)).toBe(false);
  });

  it("returns true for a non-empty string", () => {
    expect(checkForNotNull("value")).toBe(true);
  });
});

describe("stringReplaceAll", () => {
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
  it("returns NA for an empty value", () => {
    expect(convertDotValues("")).toBe("NA");
  });

  it("replaces dots with underscores for a real value", () => {
    expect(convertDotValues("foo.bar")).toBe("foo_bar");
  });
});

describe("convertToLocale", () => {
  it("returns COMMON_NA when the value is empty", () => {
    expect(convertToLocale("", "KEY")).toBe("COMMON_NA");
  });

  it("builds a KEY_VALUE locale string, upper-cased", () => {
    expect(convertToLocale("foo.bar", "KEY")).toBe("KEY_FOO_BAR");
  });
});

describe("getMohallaLocale", () => {
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
  it("returns COMMON_NA when the value is empty", () => {
    expect(getCityLocale("")).toBe("COMMON_NA");
  });

  it("builds a TENANT_TENANTS_VALUE locale string", () => {
    expect(getCityLocale("my.city")).toBe("TENANT_TENANTS_MY_CITY");
  });
});

describe("getLocalityCode", () => {
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
  it("returns rainmaker-common plus the state-specific module", () => {
    expect(getDefaultLocalizationModules("LIVELIHOOD")).toEqual([
      "rainmaker-common",
      "rainmaker-livelihood",
    ]);
  });
});
