import { beforeEach, describe, expect, it } from "vitest";
import {
  checkForNotNull,
  convertDotValues,
  convertToLocale,
  convertToLocaleData,
  getCityLocale,
  getDefaultLanguage,
  getLocaleDefault,
  getLocaleRegion,
  getLocalityCode,
  getMohallaLocale,
  getRevenueLocalityCode,
  getTransformedLocale,
  getDefaultLocalizationModules,
  namespaceToDigitModule,
  normalizeLocale,
  NAMESPACE_TO_DIGIT_MODULE,
  sortDropdownNames,
  stringReplaceAll,
  toTenantLocale,
} from "./locale-utils";

describe("locale-utils", () => {
  beforeEach(() => {
    window.globalConfigs = { getConfig: () => undefined };
  });

  describe("getLocaleRegion / getLocaleDefault / getDefaultLanguage", () => {
    it("fall back to IN / en / en_IN when no global config is set", () => {
      expect(getLocaleRegion()).toBe("IN");
      expect(getLocaleDefault()).toBe("en");
      expect(getDefaultLanguage()).toBe("en_IN");
    });

    it("read overrides from global config", () => {
      window.globalConfigs = {
        getConfig: (key: string) =>
          key === "LOCALE_REGION" ? "US" : key === "LOCALE_DEFAULT" ? "es" : undefined,
      };
      expect(getLocaleRegion()).toBe("US");
      expect(getLocaleDefault()).toBe("es");
      expect(getDefaultLanguage()).toBe("es_US");
    });
  });

  describe("normalizeLocale", () => {
    it("appends the region when the locale doesn't already include it", () => {
      expect(normalizeLocale("en")).toBe("en_IN");
    });

    it("leaves a locale that already includes the region unchanged", () => {
      expect(normalizeLocale("en_IN")).toBe("en_IN");
    });
  });

  describe("toTenantLocale", () => {
    it("replaces dots with underscores and uppercases", () => {
      expect(toTenantLocale("pb.amritsar")).toBe("PB_AMRITSAR");
    });
  });

  describe("checkForNotNull", () => {
    it("is false for undefined, empty string, and the default", () => {
      expect(checkForNotNull(undefined)).toBe(false);
      expect(checkForNotNull("")).toBe(false);
      expect(checkForNotNull()).toBe(false);
    });

    it("is true for a non-empty string", () => {
      expect(checkForNotNull("value")).toBe(true);
    });
  });

  describe("stringReplaceAll", () => {
    it("replaces every occurrence of the searcher", () => {
      expect(stringReplaceAll("a.b.c", ".", "_")).toBe("a_b_c");
    });

    it("returns the string unchanged when the searcher is empty (avoids an infinite loop)", () => {
      expect(stringReplaceAll("a.b.c", "", "_")).toBe("a.b.c");
    });
  });

  describe("convertDotValues", () => {
    it("returns 'NA' for a falsy value", () => {
      expect(convertDotValues("")).toBe("NA");
      expect(convertDotValues()).toBe("NA");
    });

    it("replaces dots with underscores for a real value", () => {
      expect(convertDotValues("pb.amritsar")).toBe("pb_amritsar");
    });
  });

  describe("convertToLocale", () => {
    it("returns COMMON_NA for an empty value", () => {
      expect(convertToLocale("", "TEST")).toBe("COMMON_NA");
    });

    it("builds a KEY_VALUE locale code, uppercased with dots replaced", () => {
      expect(convertToLocale("pb.amritsar", "TEST")).toBe("TEST_PB_AMRITSAR");
    });
  });

  describe("getMohallaLocale", () => {
    it("returns COMMON_NA when the value is empty", () => {
      expect(getMohallaLocale("", "pb.amritsar")).toBe("COMMON_NA");
    });

    it("returns COMMON_NA when the tenantId is empty", () => {
      expect(getMohallaLocale("mohalla-1", "")).toBe("COMMON_NA");
    });

    it("builds a TENANT_REVENUE_VALUE locale code", () => {
      expect(getMohallaLocale("mohalla-1", "pb.amritsar")).toBe("PB_AMRITSAR_REVENUE_MOHALLA-1");
    });
  });

  describe("getCityLocale", () => {
    it("returns COMMON_NA for an empty value", () => {
      expect(getCityLocale("")).toBe("COMMON_NA");
    });

    it("builds a TENANT_TENANTS_VALUE locale code", () => {
      expect(getCityLocale("pb.amritsar")).toBe("TENANT_TENANTS_PB_AMRITSAR");
    });
  });

  describe("getLocalityCode", () => {
    it("returns a string locality that already contains an underscore as-is", () => {
      expect(getLocalityCode("PB_ADMIN_LOCALITY1", "pb.amritsar")).toBe("PB_ADMIN_LOCALITY1");
    });

    it("builds a TENANT_ADMIN_LOCALITY code for a plain string locality", () => {
      expect(getLocalityCode("LOCALITY1", "pb.amritsar")).toBe("PB_AMRITSAR_ADMIN_LOCALITY1");
    });

    it("returns an object locality's code as-is when it already contains an underscore", () => {
      expect(getLocalityCode({ code: "PB_ADMIN_LOCALITY1" }, "pb.amritsar")).toBe(
        "PB_ADMIN_LOCALITY1",
      );
    });

    it("builds a TENANT_ADMIN_LOCALITY code for an object locality's plain code", () => {
      expect(getLocalityCode({ code: "LOCALITY1" }, "pb.amritsar")).toBe(
        "PB_AMRITSAR_ADMIN_LOCALITY1",
      );
    });

    it("returns COMMON_NA for an object locality with no code", () => {
      expect(getLocalityCode({}, "pb.amritsar")).toBe("COMMON_NA");
    });
  });

  describe("getRevenueLocalityCode", () => {
    it("returns a string locality that already contains an underscore as-is", () => {
      expect(getRevenueLocalityCode("PB_REVENUE_LOCALITY1", "pb.amritsar")).toBe(
        "PB_REVENUE_LOCALITY1",
      );
    });

    it("builds a TENANT_REVENUE_LOCALITY code for a plain string locality", () => {
      expect(getRevenueLocalityCode("LOCALITY1", "pb.amritsar")).toBe(
        "PB_AMRITSAR_REVENUE_LOCALITY1",
      );
    });

    it("builds a TENANT_REVENUE_LOCALITY code for an object locality's plain code", () => {
      expect(getRevenueLocalityCode({ code: "LOCALITY1" }, "pb.amritsar")).toBe(
        "PB_AMRITSAR_REVENUE_LOCALITY1",
      );
    });

    it("returns COMMON_NA for an object locality with no code", () => {
      expect(getRevenueLocalityCode({}, "pb.amritsar")).toBe("COMMON_NA");
    });
  });

  describe("getTransformedLocale", () => {
    it("returns a number unchanged", () => {
      expect(getTransformedLocale(42)).toBe(42);
    });

    it("returns an empty string for undefined or blank input", () => {
      expect(getTransformedLocale(undefined)).toBe("");
      expect(getTransformedLocale("   ")).toBe("");
    });

    it("uppercases and replaces punctuation/whitespace with underscores", () => {
      expect(getTransformedLocale("hello world")).toBe("HELLO_WORLD");
      expect(getTransformedLocale("a.b:c-d e/f")).toBe("A_B_C_D_E_F");
    });
  });

  describe("convertToLocaleData", () => {
    it("maps each row to its raw locale code when no translator is given", () => {
      const result = convertToLocaleData([{ code: "pb.amritsar" }], "TEST");
      expect(result).toEqual([{ code: "pb.amritsar", i18text: "TEST_PB_AMRITSAR" }]);
    });

    it("runs the locale code through the translator when one is given", () => {
      const t = (code: string) => `translated:${code}`;
      const result = convertToLocaleData([{ code: "pb.amritsar" }], "TEST", t);
      expect(result).toEqual([
        { code: "pb.amritsar", i18text: "translated:TEST_PB_AMRITSAR" },
      ]);
    });
  });

  describe("sortDropdownNames", () => {
    it("sorts options by the translated value of their option key", () => {
      const t = (code: string) => ({ ZKEY: "Banana", AKEY: "Apple" })[code] ?? code;
      const result = sortDropdownNames(
        [{ i18nKey: "ZKEY" }, { i18nKey: "AKEY" }],
        "i18nKey",
        t,
      );
      expect(result).toEqual([{ i18nKey: "AKEY" }, { i18nKey: "ZKEY" }]);
    });

    it("does not mutate the original array", () => {
      const original = [{ i18nKey: "ZKEY" }, { i18nKey: "AKEY" }];
      sortDropdownNames(original, "i18nKey", (code) => code);
      expect(original).toEqual([{ i18nKey: "ZKEY" }, { i18nKey: "AKEY" }]);
    });
  });

  describe("NAMESPACE_TO_DIGIT_MODULE", () => {
    it("maps the two generic namespaces to rainmaker-common", () => {
      expect(NAMESPACE_TO_DIGIT_MODULE).toEqual({
        common: "rainmaker-common",
        translations: "rainmaker-common",
      });
    });
  });

  describe("namespaceToDigitModule", () => {
    it("maps 'common' and 'translations' to rainmaker-common", () => {
      expect(namespaceToDigitModule("common", "pb")).toBe("rainmaker-common");
      expect(namespaceToDigitModule("translations", "pb")).toBe("rainmaker-common");
    });

    it("returns an already rainmaker-prefixed namespace unchanged", () => {
      expect(namespaceToDigitModule("rainmaker-im", "pb")).toBe("rainmaker-im");
    });

    it("maps 'state' to the tenant's own rainmaker module", () => {
      expect(namespaceToDigitModule("state", "PB")).toBe("rainmaker-pb");
    });

    it("prefixes any other namespace with rainmaker-", () => {
      expect(namespaceToDigitModule("IM", "pb")).toBe("rainmaker-im");
    });
  });

  describe("getDefaultLocalizationModules", () => {
    it("returns rainmaker-common plus the tenant's own module", () => {
      expect(getDefaultLocalizationModules("PB")).toEqual(["rainmaker-common", "rainmaker-pb"]);
    });
  });
});
