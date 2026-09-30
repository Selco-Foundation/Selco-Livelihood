import { describe, expect, it } from "vitest";
import { z } from "zod";
import { passwordConfirmationShape, refinePasswordConfirmation } from "./password-confirmation-schema";

const noopT = (key: string) => key;

const keys = {
  newRequiredKey: "NEW_REQUIRED",
  confirmRequiredKey: "CONFIRM_REQUIRED",
  mismatchKey: "MISMATCH",
};

describe("passwordConfirmationShape", () => {
  it("falls back to the default required messages when no translation is found", () => {
    const schema = z.object(passwordConfirmationShape(noopT, keys));
    const result = schema.safeParse({ newPassword: "", confirmPassword: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("New password is required");
      expect(messages).toContain("Confirm password is required");
    }
  });

  it("uses the translated required messages when a translation is found", () => {
    const t = (key: string) =>
      key === keys.newRequiredKey ? "Naya password chahiye" : key === keys.confirmRequiredKey ? "Confirm karo" : key;
    const schema = z.object(passwordConfirmationShape(t, keys));
    const result = schema.safeParse({ newPassword: "", confirmPassword: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Naya password chahiye");
      expect(messages).toContain("Confirm karo");
    }
  });

  it("passes validation when both fields are non-empty", () => {
    const schema = z.object(passwordConfirmationShape(noopT, keys));
    const result = schema.safeParse({ newPassword: "abc", confirmPassword: "abc" });
    expect(result.success).toBe(true);
  });
});

describe("refinePasswordConfirmation", () => {
  const baseSchema = z.object({ newPassword: z.string(), confirmPassword: z.string() });

  it("succeeds when newPassword and confirmPassword match", () => {
    const schema = refinePasswordConfirmation(baseSchema, noopT, keys.mismatchKey);
    const result = schema.safeParse({ newPassword: "abc123", confirmPassword: "abc123" });
    expect(result.success).toBe(true);
  });

  it("fails with the fallback mismatch message on the confirmPassword path when they differ", () => {
    const schema = refinePasswordConfirmation(baseSchema, noopT, keys.mismatchKey);
    const result = schema.safeParse({ newPassword: "abc123", confirmPassword: "xyz789" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0].message).toBe("Passwords do not match");
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
    }
  });

  it("uses the translated mismatch message when a translation is found", () => {
    const t = (key: string) => (key === keys.mismatchKey ? "Passwords match nahi karte" : key);
    const schema = refinePasswordConfirmation(baseSchema, t, keys.mismatchKey);
    const result = schema.safeParse({ newPassword: "abc123", confirmPassword: "xyz789" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Passwords match nahi karte");
    }
  });
});
