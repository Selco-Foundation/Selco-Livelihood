/**
 * Unit tests for src/config/proxy-paths.ts
 *
 * The source module has no runtime logic -- it exports a single `as const`
 * array, API_PROXY_PATHS, listing the Vite dev-server proxy path prefixes.
 * vite.config.ts consumes this array via
 * `API_PROXY_PATHS.map((p) => [p, { target, changeOrigin, secure }])` fed into
 * `Object.fromEntries` to build the dev proxy table, so the array's exact
 * contents, order, and uniqueness are load-bearing: a typo, a missing entry,
 * or a duplicate silently breaks (or duplicates-collapses) a service's dev
 * proxying.
 *
 * Since there is no behavior to mock (no network calls, no React, no
 * providers), these tests import the real module directly and assert on its
 * exact value -- a regression check that fails the moment the list drifts
 * from what is documented here, forcing a deliberate update of this file
 * whenever a path is added/removed/renamed.
 */
import { describe, expect, it } from "vitest";
import { API_PROXY_PATHS } from "./proxy-paths";

// API_PROXY_PATHS: the full, ordered list of service path prefixes the Vite
// dev server proxies to the backend when VITE_PROXY_API is set. Consumed
// exclusively by vite.config.ts to build an object keyed by these prefixes.
describe("API_PROXY_PATHS", () => {
  it("contains the exact expected set of proxy path prefixes, in order", () => {
    // This is the real regression check: any addition, removal, reordering,
    // or typo in the source array must be reflected here deliberately.
    expect(API_PROXY_PATHS).toEqual([
      "/user",
      "/user-otp",
      "/egov-hrms",
      "/boundary-service",
      "/facility-service",
      "/localization",
      "/inbox",
      "/im-services",
      "/egov-mdms-service",
      "/egov-workflow-v2",
      "/filestore",
      "/asset-registry",
    ]);
  });

  it("has exactly 12 entries", () => {
    expect(API_PROXY_PATHS).toHaveLength(12);
  });

  it("is a plain array of strings (no nested objects or non-string entries)", () => {
    expect(Array.isArray(API_PROXY_PATHS)).toBe(true);
    for (const entry of API_PROXY_PATHS) {
      expect(typeof entry).toBe("string");
    }
  });

  it("has every entry starting with a leading slash", () => {
    // vite.config.ts uses each entry verbatim as an object key matched
    // against request paths, so a missing leading slash would silently
    // fail to match any real request.
    for (const path of API_PROXY_PATHS) {
      expect(path.startsWith("/")).toBe(true);
    }
  });

  it("has no duplicate entries", () => {
    // vite.config.ts builds its proxy config via
    // Object.fromEntries(API_PROXY_PATHS.map(...)); a duplicate path would
    // silently collapse to a single object key, dropping one entry's
    // config without any error.
    const unique = new Set(API_PROXY_PATHS);
    expect(unique.size).toBe(API_PROXY_PATHS.length);
  });

  it("has no entry containing whitespace or a trailing slash", () => {
    // Malformed prefixes (stray whitespace, trailing "/") would not match
    // the leading segment of real request paths in vite.config.ts's proxy
    // matching, effectively disabling that service's dev proxy.
    for (const path of API_PROXY_PATHS) {
      expect(path).not.toMatch(/\s/);
      expect(path.endsWith("/")).toBe(false);
    }
  });

  it("produces a proxy config object with one key per path when mapped the way vite.config.ts does", () => {
    // Mirrors the exact transformation vite.config.ts applies:
    // Object.fromEntries(API_PROXY_PATHS.map((p) => [p, {...}])).
    // Asserting the resulting object's key count matches the array length
    // is an indirect but concrete check that this array is safe to feed
    // through that transformation without silent key collisions.
    const proxyConfig = Object.fromEntries(
      API_PROXY_PATHS.map((proxyPath) => [proxyPath, { target: "http://example.test", changeOrigin: true, secure: false }]),
    );
    expect(Object.keys(proxyConfig)).toHaveLength(API_PROXY_PATHS.length);
    expect(Object.keys(proxyConfig).sort()).toEqual([...API_PROXY_PATHS].sort());
  });
});
