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
  /** Highest 1-based step that can be opened. This can be used with
   * `allowAllSteps` to make only completed progress clickable. */
  maxAccessibleStep?: number;
  /**
   * 0-100 override for the rail's fill. When omitted, the fill reflects the
   * current step's position; pass this when progress should instead track
   * something else (e.g. overall record status) rather than which step is
   * merely being viewed right now.
   */
  progressPercent?: number;
}

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  allowAllSteps = false,
  maxAccessibleStep,
  progressPercent,
}: StepperProps) {
  const resolvedProgressPercent =
    progressPercent ?? (steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0);

  return (
    <div className="relative w-full">
      {/* One continuous rail spans edge-to-edge at the circles' vertical
          center (top-4 = half of the size-8 circle), sitting behind
          everything — the circles (opaque background, z-10) render on top
          of it, so it reads as passing through each number with no gaps,
          regardless of how wide any step's own label is. */}
      <div className="absolute inset-x-0 top-4 h-0.5 -translate-y-1/2 rounded-full bg-border" />
      <div
        className="absolute top-4 left-0 h-0.5 -translate-y-1/2 rounded-full bg-primary transition-[width]"
        style={{ width: `${resolvedProgressPercent}%` }}
      />
      {/* Each step is its own auto-width column (circle + label together),
          so the first and last steps sit flush at the row's edges and their
          labels stay centered directly under them. */}
      <div className="relative flex items-start">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isWithinAccessibleRange = maxAccessibleStep === undefined || stepNumber <= maxAccessibleStep;
          const isClickable =
            (isCompleted || allowAllSteps) && isWithinAccessibleRange && !isActive && Boolean(onStepClick);

          return (
            <Fragment key={step.label}>
              {index > 0 ? <div className="flex-1" /> : null}
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
    </div>
  );
}
