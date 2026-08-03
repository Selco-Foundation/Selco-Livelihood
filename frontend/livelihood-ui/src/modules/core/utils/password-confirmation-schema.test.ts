/**
 * Unit tests for password-confirmation-schema.ts.
 *
 * These are pure functions that build/refine a Zod schema, so no mocking,
 * rendering, or providers are needed - we exercise the schema directly with
 * `safeParse` and inspect the resulting success flag / issues.
 *
 * `noopT` stands in for the i18n translate function: it just echoes the key
 * back unchanged, which is exactly the signal `translateOr` (in the source
 * module) treats as "no translation found", causing it to fall back to the
 * hardcoded English default message. This lets most tests assert on the
 * English fallback text without needing a real i18n setup, while one test
 * below supplies a translating `t` to prove the real-translation path also
 * works.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { passwordConfirmationShape, refinePasswordConfirmation } from "./password-confirmation-schema";

// Echoes the key back unchanged - see file header comment for why this
// triggers translateOr's fallback-to-default-text behavior.
const noopT = (key: string) => key;
const keys = {
  newRequiredKey: "NEW_REQUIRED",
  confirmRequiredKey: "CONFIRM_REQUIRED",
  mismatchKey: "MISMATCH",
};

function buildSchema() {
  const shape = passwordConfirmationShape(noopT, keys);
  const schema = z.object(shape);
  return refinePasswordConfirmation(schema, noopT, keys.mismatchKey);
}

// `passwordConfirmationShape` builds the raw Zod field shape ({ newPassword,
// confirmPassword }, each required via `.min(1, ...)`) using translated (or
// English-fallback) required-field messages. `refinePasswordConfirmation`
// takes a `z.object(shape)` built from that shape and adds a `.refine(...)`
// that fails when `newPassword !== confirmPassword`, attaching the mismatch
// error to the `confirmPassword` path. Both expect a translate function `t`
// and the i18n keys to look up; `buildSchema()` below wires them together the
// same way the real form schema does.
describe("passwordConfirmationShape + refinePasswordConfirmation", () => {
  // Baseline happy path: equal, non-empty passwords should satisfy both the
  // per-field `.min(1)` rules and the cross-field refine check.
  it("passes validation when both passwords match", () => {
    const result = buildSchema().safeParse({ newPassword: "secret1", confirmPassword: "secret1" });
    expect(result.success).toBe(true);
  });

  it("fails with the mismatch message when passwords differ", () => {
    const result = buildSchema().safeParse({ newPassword: "secret1", confirmPassword: "secret2" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
      // noopT echoes the key back, which is translateOr's "missing translation"
      // signal, so it falls back to the English default text, not the raw key.
      expect(result.error.issues[0].message).toBe("Passwords do not match");
    }
  });

  // `.min(1, ...)` on newPassword rejects an empty string even when
  // confirmPassword is also empty (i.e. before the mismatch refine even runs),
  // so this must fail on the per-field required rule, not the match check.
  it("requires newPassword to be non-empty", () => {
    const result = buildSchema().safeParse({ newPassword: "", confirmPassword: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "newPassword")).toBe(true);
    }
  });

  // Same required-field rule as above, but for confirmPassword: an empty
  // confirmPassword must fail validation even though newPassword is valid.
  it("requires confirmPassword to be non-empty", () => {
    const result = buildSchema().safeParse({ newPassword: "secret1", confirmPassword: "" });
    expect(result.success).toBe(false);
  });

  // Here `t` actually translates NEW_REQUIRED (unlike noopT, which echoes the
  // key), so translateOr should return the translated string rather than
  // falling back to the English default - proving the real-translation path
  // works, not just the fallback path exercised elsewhere in this file.
  it("uses the translated required-field messages", () => {
    const t = (key: string) => (key === "NEW_REQUIRED" ? "New password required" : key);
    const shape = passwordConfirmationShape(t, keys);
    const result = z.object(shape).safeParse({ newPassword: "", confirmPassword: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("New password required");
    }
  });
});
