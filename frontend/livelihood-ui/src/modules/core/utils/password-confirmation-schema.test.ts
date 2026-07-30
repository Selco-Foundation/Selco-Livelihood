import { describe, expect, it } from "vitest";
import { z } from "zod";
import { passwordConfirmationShape, refinePasswordConfirmation } from "./password-confirmation-schema";

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

describe("passwordConfirmationShape + refinePasswordConfirmation", () => {
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

  it("requires newPassword to be non-empty", () => {
    const result = buildSchema().safeParse({ newPassword: "", confirmPassword: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "newPassword")).toBe(true);
    }
  });

  it("requires confirmPassword to be non-empty", () => {
    const result = buildSchema().safeParse({ newPassword: "secret1", confirmPassword: "" });
    expect(result.success).toBe(false);
  });

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
