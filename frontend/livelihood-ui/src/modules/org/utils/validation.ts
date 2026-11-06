import { translateOr } from "@/shared";
import type { TFunction } from "i18next";

/**
 * Letters, digits, spaces and `- ' \` .` (e.g. "Project manager 1").
 * vendor-registry and egov-hrms must allow digits too — their User.name
 * @Pattern was letters-only.
 */
export const PERSON_NAME_PATTERN = /^[a-zA-Z0-9 \-'`.]*$/;
export const PHONE_PATTERN = /^[0-9]{10}$/;
export const NO_WHITESPACE_PATTERN = /^\S*$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * egov-user's default password policy: 8–15 characters with at least one
 * upper-case letter, one lower-case letter, one digit and one of `@#$%`.
 */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%])[A-Za-z\d@#$%]{8,15}$/;

export function requiredMessage(t: TFunction) {
  return translateOr(t, "CORE_COMMON_REQUIRED", "Required");
}

export function validatePersonName(value: string, t: TFunction): string | undefined {
  if (!value.trim()) return requiredMessage(t);
  if (!PERSON_NAME_PATTERN.test(value.trim())) {
    return translateOr(t, "ORG_NAME_INVALID_CHARACTERS", "Name can only contain letters, numbers, spaces and - ' .");
  }
  return undefined;
}

export function validatePhone(value: string, t: TFunction): string | undefined {
  if (!value.trim()) return requiredMessage(t);
  if (!PHONE_PATTERN.test(value.trim())) {
    return translateOr(t, "ORG_PHONE_INVALID", "Enter a valid 10-digit phone number");
  }
  return undefined;
}

export function validateOptionalEmail(value: string, t: TFunction): string | undefined {
  if (value.trim() && !EMAIL_PATTERN.test(value.trim())) {
    return translateOr(t, "CS_PROFILE_EMAIL_ERRORMSG", "Enter a valid email address");
  }
  return undefined;
}

export function validateUsername(value: string, t: TFunction): string | undefined {
  if (!value.trim()) return requiredMessage(t);
  if (!NO_WHITESPACE_PATTERN.test(value)) {
    return translateOr(t, "ORG_USERNAME_NO_SPACES", "Username cannot contain spaces");
  }
  return undefined;
}

/** `required` = false lets a blank password through (edit-user: blank means unchanged). */
export function validatePassword(
  password: string,
  confirmPassword: string,
  t: TFunction,
  required: boolean,
): { password?: string; confirmPassword?: string } {
  if (!password) {
    if (!required && !confirmPassword) return {};
    return { password: requiredMessage(t) };
  }
  if (!PASSWORD_PATTERN.test(password)) {
    return {
      password: translateOr(
        t,
        "ORG_PASSWORD_POLICY_ERROR",
        "Use 8–15 characters with an upper-case letter, a lower-case letter, a number and one of @ # $ %",
      ),
    };
  }
  if (password !== confirmPassword) {
    return {
      confirmPassword: translateOr(t, "ORG_PASSWORD_MISMATCH", "Passwords do not match"),
    };
  }
  return {};
}
