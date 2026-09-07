import { DateField } from "../DateField";

export interface ProjectDetailsValue {
  justificationCode: string;
  startDate?: Date;
  endDate?: Date;
}

interface ProjectDetailsStepProps {
  value: ProjectDetailsValue;
  onChange: (value: ProjectDetailsValue) => void;
  /** True once the project has already started server-side — the backend
   *  refuses to move a start date that has passed. */
  startDateLocked?: boolean;
}

const JUSTIFICATION_CODE_LENGTH = 4;

export function isProjectDetailsValid(value: ProjectDetailsValue): boolean {
  return (
    value.justificationCode.length === JUSTIFICATION_CODE_LENGTH &&
    Boolean(value.startDate) &&
    Boolean(value.endDate) &&
    (!value.startDate || !value.endDate || value.startDate <= value.endDate)
  );
}

export function ProjectDetailsStep({
  value,
  onChange,
  startDateLocked = false,
}: ProjectDetailsStepProps) {
  function handleJustificationCodeChange(raw: string) {
    const lettersOnly = raw
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, JUSTIFICATION_CODE_LENGTH);
    onChange({ ...value, justificationCode: lettersOnly });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Project Details</h2>
        <p className="text-sm text-muted-foreground">
          Enter details of the Project. These cannot be changed once submitted.
        </p>
      </div>

      <div className="max-w-sm space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Justification Code
          <span className="text-destructive"> *</span>
        </label>
        <input
          type="text"
          value={value.justificationCode}
          onChange={(event) => handleJustificationCodeChange(event.target.value)}
          placeholder="ABCD"
          maxLength={JUSTIFICATION_CODE_LENGTH}
          className="livelihood-filter-select h-11 tracking-widest uppercase"
        />
        <p className="text-xs text-muted-foreground">Exactly 4 letters (A-Z)</p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Project Dates
          <span className="text-destructive"> *</span>
        </label>
        <div className="mt-1.5 flex gap-4">
          <DateField
            label="Start Date"
            value={value.startDate}
            disabled={startDateLocked}
            onChange={(date) => onChange({ ...value, startDate: date })}
          />
          <DateField
            label="End Date"
            value={value.endDate}
            minDate={value.startDate}
            onChange={(date) => onChange({ ...value, endDate: date })}
          />
        </div>
        {startDateLocked ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            The start date can no longer be changed because this project has already started.
          </p>
        ) : null}
      </div>
    </div>
  );
}
