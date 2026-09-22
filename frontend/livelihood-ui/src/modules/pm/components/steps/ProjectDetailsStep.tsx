import { translateOr, useTranslate } from "@/shared";
import { Input, Label } from "@/ui";
import { FileText } from "lucide-react";
import { useSectors } from "../../hooks/use-sectors";
import { DateField } from "../DateField";
import { LabeledSelect } from "../LabeledSelect";
import { StepSectionCard } from "../StepSectionCard";

export interface ProjectDetailsValue {
  justificationCode: string;
  /** Required by `project/v1/_create` — the proven live payload used the sector name here. */
  projectType: string;
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

const JUSTIFICATION_CODE_PATTERN = /^[A-Z]{4}$/;

export function isProjectDetailsValid(value: ProjectDetailsValue): boolean {
  return (
    JUSTIFICATION_CODE_PATTERN.test(value.justificationCode) &&
    Boolean(value.projectType) &&
    Boolean(value.startDate) &&
    Boolean(value.endDate) &&
    (!value.startDate || !value.endDate || value.startDate <= value.endDate)
  );
}

export function ProjectDetailsStep({ value, onChange, errors, locked = false }: ProjectDetailsStepProps) {
  const { t } = useTranslate();
  const { data: projectTypeOptions = [] } = useSectors();

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
          <Input
            id="justification-code"
            value={value.justificationCode}
            maxLength={4}
            disabled={locked}
            placeholder={translateOr(t, "ES_PM_JUSTIFICATION_CODE_PLACEHOLDER", "e.g. SLKA")}
            onChange={(event) =>
              onChange({
                ...value,
                justificationCode: event.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
              })
            }
          />
          {errors?.justificationCode ? (
            <p className="text-xs text-destructive">{errors.justificationCode}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {translateOr(t, "ES_PM_JUSTIFICATION_CODE_HELP", "Exactly 4 letters")}
            </p>
          )}
        </div>

        <LabeledSelect
          label={translateOr(t, "ES_PM_PROJECT_TYPE", "Project Type")}
          required
          value={value.projectType}
          options={projectTypeOptions}
          placeholder={translateOr(t, "ES_PM_SELECT_PROJECT_TYPE", "Select Project Type")}
          onChange={(projectType) => onChange({ ...value, projectType })}
          disabled={locked}
        />

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
