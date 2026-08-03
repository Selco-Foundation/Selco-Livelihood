/**
 * Unit tests for src/modules/im/types/incident-details.ts
 *
 * The source file exports only TypeScript interfaces —
 * `IncidentAuditDetails`, `IncidentAdditionalDetail`, `Incident`,
 * `IncidentWorkflow`, `IncidentWrapper`, `IncidentSearchResponse`,
 * `ComplaintDetailsRow`, `ComplaintDetailsData`, `WorkflowAssignee`,
 * `WorkflowProcessInstance`, `WorkflowActionState`,
 * `WorkflowTimelineCheckpoint`, `WorkflowDetailsData`,
 * `WorkflowProcessSearchResponse`, `WorkflowBusinessServiceState`,
 * `WorkflowBusinessServiceResponse`, `FileStoreUrlEntry`,
 * `FileStoreUrlResponse`, `MdmsReasonOption`, and
 * `UpdateIncidentResponse` — used across the Incident Management (IM)
 * "incident details" / "workflow details" flows to describe the shape of
 * incident records, their audit/additional-detail metadata, workflow process
 * instances and timeline checkpoints, business-service state machine
 * responses, MDMS reason-option lookups, and file-store URL resolution
 * responses. It also imports one type (`VerificationDocument`) from
 * ./create-incident via `import type`, which is erased at compile time and
 * produces no runtime dependency either.
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
 * export), every module that does `import type { ... } from "./incident-details"`
 * elsewhere in the app would keep compiling fine, yet the bundle would now
 * ship dead runtime code from what is meant to be a types-only module.
 * Asserting an empty export set here catches that regression immediately.
 */
import { describe, expect, it } from "vitest";
import * as M from "./incident-details";

// The whole module: every export (all 20 interfaces listed above) is
// declared with the `interface` keyword, which (like `type`) produces no
// JavaScript output. Importing the compiled module and inspecting its
// exports is therefore the only way to prove, at test time, that nothing
// runtime-visible has crept in alongside the type declarations.
describe("modules/im/types/incident-details (type-only module)", () => {
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
    const mod = M as Record<string, unknown>;
    expect(mod.IncidentAuditDetails).toBeUndefined();
    expect(mod.IncidentAdditionalDetail).toBeUndefined();
    expect(mod.Incident).toBeUndefined();
    expect(mod.IncidentWorkflow).toBeUndefined();
    expect(mod.IncidentWrapper).toBeUndefined();
    expect(mod.IncidentSearchResponse).toBeUndefined();
    expect(mod.ComplaintDetailsRow).toBeUndefined();
    expect(mod.ComplaintDetailsData).toBeUndefined();
    expect(mod.WorkflowAssignee).toBeUndefined();
    expect(mod.WorkflowProcessInstance).toBeUndefined();
    expect(mod.WorkflowActionState).toBeUndefined();
    expect(mod.WorkflowTimelineCheckpoint).toBeUndefined();
    expect(mod.WorkflowDetailsData).toBeUndefined();
    expect(mod.WorkflowProcessSearchResponse).toBeUndefined();
    expect(mod.WorkflowBusinessServiceState).toBeUndefined();
    expect(mod.WorkflowBusinessServiceResponse).toBeUndefined();
    expect(mod.FileStoreUrlEntry).toBeUndefined();
    expect(mod.FileStoreUrlResponse).toBeUndefined();
    expect(mod.MdmsReasonOption).toBeUndefined();
    expect(mod.UpdateIncidentResponse).toBeUndefined();
  });

  it("does not leak a runtime value from the imported create-incident type", () => {
    // The source file does `import type { VerificationDocument } from
    // "./create-incident"` — the `type` keyword guarantees this import is
    // erased entirely, so that name must never surface as a runtime export
    // of this module either (this file does not re-export it, but this
    // guards against a future accidental `export type { ... }` regression
    // that forgets the `type` modifier).
    expect((M as Record<string, unknown>).VerificationDocument).toBeUndefined();
  });
});
