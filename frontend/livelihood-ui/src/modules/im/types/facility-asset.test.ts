/**
 * Unit tests for src/modules/im/types/facility-asset.ts
 *
 * The source file exports four interfaces — `LivelihoodFacilityAddress`,
 * `LivelihoodFacility`, `LivelihoodAsset`, and `FacilityBulkSearchCriteria` —
 * used across the IM module to type facility/address/asset shapes and the
 * bulk-search criteria payload sent to the facility search API. All four are
 * declared with the `interface` keyword, which (like `type`) is erased
 * entirely at compile time and produces no JavaScript output. There are no
 * functions, constants, classes, or enums in this file to call or invoke, so
 * this file has (and must have) zero runtime exports.
 *
 * Testing approach: no mocking, no provider wrapper, and no rendering — the
 * module is imported as a namespace (`import * as M`) and asserted to have
 * no own enumerable keys. This is a genuine (if small) regression check: if
 * a future edit ever introduces a runtime value into this file (e.g. a
 * helper function, a default object, a const enum, or a non-`type`/
 * non-`interface` export), every module that does
 * `import type { ... } from "./facility-asset"` elsewhere in the app would
 * keep compiling fine, yet the bundle would now ship dead runtime code from
 * what is meant to be a types-only module. Asserting an empty export set
 * here catches that regression immediately.
 */
import { describe, expect, it } from "vitest";
import * as M from "./facility-asset";

// The whole module: `LivelihoodFacilityAddress`, `LivelihoodFacility`,
// `LivelihoodAsset`, and `FacilityBulkSearchCriteria` are all declared with
// the `interface` keyword, which produces no JavaScript output. Importing
// the compiled module and inspecting its exports is therefore the only way
// to prove, at test time, that nothing runtime-visible has crept in
// alongside the type declarations.
describe("modules/im/types/facility-asset (type-only module)", () => {
  it("has no runtime exports — Object.keys is empty", () => {
    // Precondition: `M` is the namespace produced by importing the compiled
    // JS for this file. A type-only source file compiles to an empty module
    // object, so its own enumerable keys must be an empty array.
    expect(Object.keys(M)).toEqual([]);
  });

  it("does not export any function, object, or primitive value under a known name", () => {
    // Belt-and-braces check on top of the empty-keys assertion above: even
    // if a future change added a non-enumerable or symbol-keyed export,
    // explicitly probing each documented interface name for a runtime value
    // guards against that being missed by Object.keys alone.
    expect((M as Record<string, unknown>).LivelihoodFacilityAddress).toBeUndefined();
    expect((M as Record<string, unknown>).LivelihoodFacility).toBeUndefined();
    expect((M as Record<string, unknown>).LivelihoodAsset).toBeUndefined();
    expect((M as Record<string, unknown>).FacilityBulkSearchCriteria).toBeUndefined();
  });
});
