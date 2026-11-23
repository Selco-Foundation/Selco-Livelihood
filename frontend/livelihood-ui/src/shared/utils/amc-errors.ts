import { extractApiErrorMessage } from "../api/errors";
import { translateOr } from "../i18n/translate-or";

/** One row of an AMC error: the server writes `row N (<id>), <field>: <reason>`. */
export interface AmcErrorRow {
  /** Position in the request, from 0. */
  index: number;
  /** The row's `activityFacilityId` (create, field staff) or AMC id (update, turn off). */
  id?: string;
}

/** Thrown when a published plan's solar installation rows can't be found yet. */
export const AMC_INSTALLATION_NOT_READY = "AMC_INSTALLATION_NOT_READY";

/** Thrown when MDMS flags no default frequency or duration. */
export const AMC_DEFAULTS_MISSING = "AMC_DEFAULTS_MISSING";

/** AMC error code -> what the user reads. The localization key is `ES_AMC_ERR_<code>`. */
const AMC_ERROR_TEXT: Record<string, string> = {
  DUPLICATE_AMC_CONFIGURATION: "an AMC is already running",
  DUPLICATE_ACTIVITY_FACILITY: "the same installation is listed twice",
  AMC_INVALID_ACTIVITY_FACILITY: "the solar installation was not found",
  AMC_SOLAR_ASSET_NOT_FOUND: "the installation is approved but has no solar asset",
  AMC_INSTALLATION_APPROVAL_DATE_MISSING: "the installation is approved but has no approval date",
  AMC_INVALID_FREQUENCY: "the AMC frequency is not allowed",
  AMC_INVALID_DURATION: "the number of years is not allowed with this frequency",
  AMC_INVALID_VENDOR_ORG: "the vendor organisation is not active",
  AMC_FIELD_STAFF_NOT_IN_ORG: "the AMC field staff is not a member of the vendor organisation",
  AMC_FIELD_STAFF_ROLE_MISSING: "the selected person does not have the AMC field staff role",
  AMC_START_DATE_NOT_ALLOWED: "the start date is set when the installation is approved",
  AMC_START_DATE_REQUIRED: "the installation is already approved, so a start date is required",
  AMC_START_BEFORE_INSTALLATION: "the start date is before the installation approval date",
  AMC_START_DATE_LOCKED: "the start date can't change once visit 1 is submitted",
  AMC_TOTAL_BELOW_SUBMITTED: "the years and frequency give fewer visits than are already submitted",
  AMC_COMPLETED: "the AMC is completed and can't be changed",
  AMC_NOT_FOUND: "there is no running AMC; it may have been turned off",
  AMC_ASSIGNMENT_CHANGE_NOT_ALLOWED: "the vendor and field staff can't be changed here",
  AMC_NO_REJECTED_VISIT_TO_MOVE: "there is no rework visit left with an earlier vendor",
  AMC_INVALID_TENANT: "the request is for a different tenant",
  [AMC_INSTALLATION_NOT_READY]: "the installation is not ready yet. Try again in a minute",
  [AMC_DEFAULTS_MISSING]: "no default AMC frequency or number of years is configured",
};

const ROW_PATTERN = /^row (\d+)(?: \(([^)]*)\))?, \w+: /;

/** The rows named in one error message; empty when the message is not in the per-row form. */
export function parseAmcErrorRows(message: string): AmcErrorRow[] {
  return message.split(/; (?=row \d+[ ,])/).flatMap((part) => {
    const match = ROW_PATTERN.exec(part);
    return match ? [{ index: Number(match[1]) - 1, id: match[2] || undefined }] : [];
  });
}

/**
 * An AMC API error as the user should read it: every error, with the end users it is about
 * (`nameOf` a row) instead of row numbers and ids. Falls back to the server's own message for any
 * other error; undefined when there is none.
 */
export function amcErrorText(
  error: unknown,
  t: (key: string) => string,
  nameOf: (row: AmcErrorRow) => string | undefined = () => undefined,
): string | undefined {
  const textOf = (code: string) =>
    Object.hasOwn(AMC_ERROR_TEXT, code) ? translateOr(t, `ES_AMC_ERR_${code}`, AMC_ERROR_TEXT[code]) : undefined;
  const body = (error as { response?: { data?: { Errors?: unknown } } } | undefined)?.response?.data;
  const apiErrors = Array.isArray(body?.Errors) ? (body.Errors as { code?: string; message?: string }[]) : [];

  const lines = apiErrors.flatMap(({ code, message }) => {
    const text = textOf(code ?? "");
    if (!text) return message ? [message] : [];
    const names = parseAmcErrorRows(message ?? "").flatMap((row) => nameOf(row) ?? []);
    const unique = [...new Set(names)];
    return [unique.length > 0 ? `${unique.join(", ")}: ${text}` : capitalise(text)];
  });
  if (lines.length > 0) return lines.join("; ");

  const thrown = error instanceof Error ? textOf(error.message) : undefined;
  return thrown ? capitalise(thrown) : extractApiErrorMessage(error);
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
