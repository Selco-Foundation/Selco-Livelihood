import { Check } from "lucide-react";
import { Fragment } from "react";
import { cn } from "../../lib/utils";

export interface StepDefinition {
  label: string;
}

export interface StepperProps {
  steps: StepDefinition[];
  /** 1-based index of the current step. */
  currentStep: number;
  /** Fired only for steps strictly before the current one — the stepper
   *  never allows jumping ahead — unless `allowAllSteps` is set. */
  onStepClick?: (step: number) => void;
  /** When true, every step is clickable, including ones after the current
   *  one — use this when all steps already have data to show (e.g. editing
   *  an existing draft), so any step can be revisited directly. */
  allowAllSteps?: boolean;
  /**
   * 0-100 override for the bottom progress bar. When omitted, the bar
   * reflects the current step's position; pass this when progress should
   * instead track something else (e.g. overall record status) rather than
   * which step is merely being viewed right now.
   */
  progressPercent?: number;
}

export function Stepper({ steps, currentStep, onStepClick, allowAllSteps = false, progressPercent }: StepperProps) {
  const resolvedProgressPercent =
    progressPercent ?? (steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0);

  return (
    <div className="w-full">
      {/* Each step is its own auto-width column (circle + label together),
          so the first and last steps sit flush at the row's edges and their
          labels stay centered directly under them — only the connecting
          lines between columns stretch to fill the remaining space. */}
      <div className="flex items-start">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isClickable = (isCompleted || allowAllSteps) && !isActive && Boolean(onStepClick);

          return (
            <Fragment key={step.label}>
              {index > 0 ? (
                <div
                  className={cn(
                    "mt-4 h-px flex-1",
                    stepNumber - 1 < currentStep ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick?.(stepNumber)}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isActive && "border-primary bg-card text-primary",
                    !isCompleted && !isActive && "border-border bg-card text-muted-foreground",
                    isClickable && "cursor-pointer",
                    !isClickable && "cursor-default",
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : stepNumber}
                </button>
                <span
                  className={cn(
                    "mt-2 text-center text-xs font-medium whitespace-nowrap",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
      <div className="mt-4 h-0.5 w-full rounded-full bg-border">
        <div
          className="h-0.5 rounded-full bg-primary transition-[width]"
          style={{ width: `${resolvedProgressPercent}%` }}
        />
      </div>
    </div>
  );
}
