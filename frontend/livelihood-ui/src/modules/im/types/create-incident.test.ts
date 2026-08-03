/**
 * Unit tests for src/modules/im/types/create-incident.ts
 *
 * The source file exports only TypeScript interfaces —
 * `SelectOption`, `VerificationDocument`, `UploadedMediaEntry`,
 * `CreateIncidentFormValues`, and `CreateIncidentResponse` — used across the
 * Incident Management (IM) "create incident" flow to describe the shape of
 * dropdown option data, uploaded verification documents/media, the create
 * incident form's values, and the API response returned after submitting a
 * new incident. It also imports two types (`LivelihoodFacility`,
 * `LivelihoodAsset`) from ./facility-asset via `import type`, which is
 * erased at compile time and produces no runtime dependency either.
 *
 * TypeScript interfaces/types are erased at compile time, so this file has
 * (and must have) zero runtime exports — there are no functions, constants,
 * classes, or enums to call or invoke.
 *
 * Testing approach: no mocking, no provider wrapper, and no rendering — the
 * module is imported as a namespace (`import * as M`) and asserted to have
 * no own enumerable keys. This is a genuine (if small) regression check: if
 * a future edit ever introduces a runtime value into this file (e.g. a
 * helper function, a default object, a class, or a non-`type`/non-`interface`
 * export), every module that does `import type { ... } from "./create-incident"`
 * elsewhere in the app would keep compiling fine, yet the bundle would now
 * ship dead runtime code from what is meant to be a types-only module.
 * Asserting an empty export set here catches that regression immediately.
 */
import { describe, expect, it } from "vitest";
import * as M from "./create-incident";

// The whole module: every export (`SelectOption`, `VerificationDocument`,
// `UploadedMediaEntry`, `CreateIncidentFormValues`, `CreateIncidentResponse`)
// is declared with the `interface` keyword, which (like `type`) produces no
// JavaScript output. Importing the compiled module and inspecting its
// exports is therefore the only way to prove, at test time, that nothing
// runtime-visible has crept in alongside the type declarations.
describe("modules/im/types/create-incident (type-only module)", () => {
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
    expect((M as Record<string, unknown>).SelectOption).toBeUndefined();
    expect((M as Record<string, unknown>).VerificationDocument).toBeUndefined();
    expect((M as Record<string, unknown>).UploadedMediaEntry).toBeUndefined();
    expect(
      (M as Record<string, unknown>).CreateIncidentFormValues,
    ).toBeUndefined();
    expect(
      (M as Record<string, unknown>).CreateIncidentResponse,
    ).toBeUndefined();
  });

  it("does not leak a runtime value from the re-exported facility-asset types", () => {
    // The source file does `import type { LivelihoodAsset, LivelihoodFacility }
    // from "./facility-asset"` — the `type` keyword guarantees this import is
    // erased entirely, so those names must never surface as runtime exports
    // of this module either (this file does not re-export them, but this
    // guards against a future accidental `export type { ... }` regression
    // that forgets the `type` modifier).
    expect((M as Record<string, unknown>).LivelihoodAsset).toBeUndefined();
    expect((M as Record<string, unknown>).LivelihoodFacility).toBeUndefined();
  });
});
