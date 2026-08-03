/**
 * Unit tests for use-im-inbox-summary.ts.
 *
 * This module is a pure re-export shim: it has no logic of its own and simply
 * forwards `useImInboxData`, `useImInboxSummary`, and `useImAssetTypes` from
 * `./use-im-inbox-data` (which owns the real implementation and already has
 * its own full behavioral test suite in use-im-inbox-data.test.tsx).
 *
 * Because there is no runtime behavior beyond re-exporting, the meaningful
 * regression check here is a same-reference identity check: import both the
 * shim module and the real module with `import * as`, and assert each
 * exported symbol on the shim is *the exact same function reference* as on
 * the source module. This catches the real failure mode for a barrel file --
 * someone edits use-im-inbox-data.ts (renames/removes/wraps an export) and
 * forgets to update this re-export, or the export list silently drifts out
 * of sync. No provider wrapper (QueryClientProvider/I18nextProvider/router)
 * is needed since we never invoke the hooks here -- we only inspect the
 * exported bindings themselves.
 */
import { describe, expect, it } from "vitest";
import * as summaryShim from "./use-im-inbox-summary";
import * as inboxData from "./use-im-inbox-data";

// The shim re-exports exactly these three hooks from use-im-inbox-data.ts.
// Each should be a defined function and, critically, must be reference-equal
// (===) to the original export -- not merely equal by name or behavior --
// since re-exports in JS/TS are live bindings to the same function object.
describe("use-im-inbox-summary re-export shim", () => {
  it("re-exports useImInboxSummary as the exact same function reference", () => {
    expect(typeof summaryShim.useImInboxSummary).toBe("function");
    expect(summaryShim.useImInboxSummary).toBe(inboxData.useImInboxSummary);
  });

  it("re-exports useImInboxData as the exact same function reference", () => {
    expect(typeof summaryShim.useImInboxData).toBe("function");
    expect(summaryShim.useImInboxData).toBe(inboxData.useImInboxData);
  });

  it("re-exports useImAssetTypes as the exact same function reference", () => {
    expect(typeof summaryShim.useImAssetTypes).toBe("function");
    expect(summaryShim.useImAssetTypes).toBe(inboxData.useImAssetTypes);
  });

  // Guards against the shim silently gaining or losing exports (e.g. a
  // partial re-export edit that adds a new hook to use-im-inbox-data.ts but
  // forgets to forward it here, or vice versa) -- the exported key set on
  // the shim must match exactly the three hooks it is documented to expose.
  it("exposes exactly the three documented exports and nothing else", () => {
    expect(Object.keys(summaryShim).sort()).toEqual(
      ["useImAssetTypes", "useImInboxData", "useImInboxSummary"].sort(),
    );
  });
});
