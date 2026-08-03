/**
 * Unit tests for src/shared/modules/types.ts
 *
 * The source file exports only two interfaces, `NavItem` and
 * `ModuleDefinition<TRoute>`, both consumed by src/modules.ts,
 * src/module-registry.ts, src/modules/core/index.ts and
 * src/modules/core/layout/AppShell.tsx to describe a feature module's nav
 * entries and registration shape. TypeScript interfaces/types are erased at
 * compile time, so this file has (and must have) zero runtime exports —
 * there are no functions, constants, classes, or enums to call or invoke.
 *
 * Testing approach: no mocking, no provider wrapper, and no rendering — the
 * module is imported as a namespace (`import * as M`) and asserted to have
 * no own enumerable keys. This is a genuine (if small) regression check: if
 * a future edit ever introduces a runtime value into this file (e.g. a
 * helper function, a default object, or a non-`type`/non-`interface`
 * export), every module that does `import type { ... } from "./types"`
 * elsewhere in the app would keep compiling fine under `isolatedModules`
 * assumptions, yet the bundle would now ship dead runtime code from what is
 * meant to be a types-only module. Asserting an empty export set here
 * catches that regression immediately.
 */
import { describe, expect, it } from "vitest";
import * as M from "./types";

// The whole module: `NavItem` and `ModuleDefinition` are declared with the
// `interface` keyword, which (like `type`) produces no JavaScript output.
// Importing the compiled module and inspecting its exports is therefore the
// only way to prove, at test time, that nothing runtime-visible has crept
// in alongside the type declarations.
describe("shared/modules/types (type-only module)", () => {
  it("has no runtime exports — Object.keys is empty", () => {
    // Precondition: `M` is the namespace produced by importing the compiled
    // JS for this file. A type-only source file compiles to an empty module
    // object, so its own enumerable keys must be an empty array.
    expect(Object.keys(M)).toEqual([]);
  });

  it("does not export any function, object, or primitive value under a known name", () => {
    // Belt-and-braces check on top of the empty-keys assertion above: even
    // if a future change added a non-enumerable or symbol-keyed export,
    // explicitly probing the two documented type names for a runtime value
    // guards against that being missed by Object.keys alone.
    expect((M as Record<string, unknown>).NavItem).toBeUndefined();
    expect((M as Record<string, unknown>).ModuleDefinition).toBeUndefined();
  });
});
