import { translateOr, useTranslate } from "@/shared";
import { Input, Label } from "@/ui";
import { FileText } from "lucide-react";
import { useJustificationCodePrefix } from "../../hooks/use-justification-code-prefix";
import { FALLBACK_JUSTIFICATION_CODE_PREFIX } from "../../utils/justification-code-prefix-mapping";
import { DateField } from "../DateField";
import { StepSectionCard } from "../StepSectionCard";

export interface ProjectDetailsValue {
  justificationCode: string;
  startDate?: number;
  endDate?: number;
}

interface ProjectDetailsStepProps {
  value: ProjectDetailsValue;
  onChange: (value: ProjectDetailsValue) => void;
  errors?: Partial<Record<keyof ProjectDetailsValue, string>>;
  /** True once the project already exists (draft or later) — the
   *  justification code and dates are fixed at creation time and can no
   *  longer be edited, only the geography step remains editable. */
  locked?: boolean;
}

/** 5 mandatory digits, optionally followed by a dash and a 1-2 digit version
 * suffix (e.g. "12345", "12345-1", "12345-10"). The "JUS-"/"SFJ-" prefix is
 * never part of this stored value — it's rendered separately as a fixed,
 * non-editable UI prefix (see `useJustificationCodePrefix`). */
const JUSTIFICATION_CODE_PATTERN = /^\d{5}(-\d{1,2})?$/;

/** `allowLegacyCode` is for an existing project, whose code is locked: one saved before the
 *  5-digit format (e.g. "SLKA") stays valid, so only a non-empty code is required -- the dates
 *  are still checked. */
export function isProjectDetailsValid(value: ProjectDetailsValue, allowLegacyCode = false): boolean {
  const codeIsValid = allowLegacyCode
    ? Boolean(value.justificationCode)
    : JUSTIFICATION_CODE_PATTERN.test(value.justificationCode);

  return (
    codeIsValid &&
    Boolean(value.startDate) &&
    Boolean(value.endDate) &&
    (!value.startDate || !value.endDate || value.startDate <= value.endDate)
  );
}

export function ProjectDetailsStep({ value, onChange, errors, locked = false }: Readonly<ProjectDetailsStepProps>) {
  const { t } = useTranslate();
  const { data: justificationCodePrefix } = useJustificationCodePrefix();

  // Only flags a format error once enough has been typed to judge it (the
  // mandatory 5 digits) — otherwise every keystroke while typing the first
  // few digits would flash red. A locked code is never flagged -- it can't be edited, and a legacy
  // one is valid as it stands. An externally-supplied error (e.g. a duplicate-code rejection
  // from the backend) always takes priority.
  const formatError =
    !locked && value.justificationCode.length >= 5 && !JUSTIFICATION_CODE_PATTERN.test(value.justificationCode)
      ? translateOr(
          t,
          "ES_PM_JUSTIFICATION_CODE_INVALID",
          "Enter a valid code: 5 digits, optionally followed by -1 or -2 digit suffix (e.g. 98234 or 98234-1)",
        )
      : undefined;
  const justificationCodeError = errors?.justificationCode ?? formatError;

  return (
    <StepSectionCard
      icon={FileText}
      title={translateOr(t, "ES_PM_PROJECT_DETAILS", "Project Details")}
      description={translateOr(
        t,
        "ES_PM_PROJECT_DETAILS_DESC",
        locked
          ? "Justification code and dates are locked once the project is created"
          : "Enter details of the Project. These cannot be changed once submitted.",
      )}
    >
      <div className="max-w-md space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="justification-code">
            {translateOr(t, "ES_PM_JUSTIFICATION_CODE", "Justification Code")}
            <span className="text-destructive"> *</span>
          </Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-sm text-ink-600">
              {`${justificationCodePrefix ?? FALLBACK_JUSTIFICATION_CODE_PREFIX}-`}
            </span>
            <Input
              id="justification-code"
              value={value.justificationCode}
              maxLength={8}
              disabled={locked}
              placeholder={translateOr(t, "ES_PM_JUSTIFICATION_CODE_PLACEHOLDER", "e.g. 98234")}
              className="pl-12"
              onChange={(event) => {
                const raw = event.target.value.replace(/[^\d-]/g, "");
                const [main, ...rest] = raw.split("-");
                onChange({
                  ...value,
                  justificationCode: rest.length ? `${main}-${rest.join("")}` : main,
                });
              }}
            />
          </div>
          {justificationCodeError ? (
            <p className="text-xs text-destructive">{justificationCodeError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {translateOr(
                t,
                "ES_PM_JUSTIFICATION_CODE_HELP",
                "5 digits, optionally followed by -1 or -2 digit suffix (e.g. 98234 or 98234-1)",
              )}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>
            {translateOr(t, "ES_PM_PROJECT_DATES", "Project Dates")}
            <span className="text-destructive"> *</span>
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <DateField
              label={translateOr(t, "ES_PM_START_DATE", "Start Date")}
              value={value.startDate}
              onChange={(startDate) => onChange({ ...value, startDate })}
              error={errors?.startDate}
              disabled={locked}
            />

            <DateField
              label={translateOr(t, "ES_PM_END_DATE", "End Date")}
              value={value.endDate}
              onChange={(endDate) => onChange({ ...value, endDate })}
              minDate={value.startDate ? new Date(value.startDate) : undefined}
              error={errors?.endDate}
              disabled={locked}
            />
          </div>
        </div>
      </div>
    </StepSectionCard>
  );
}
