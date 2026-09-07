import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface StepDefinition {
  label: string;
}

export interface StepperProps {
  steps: StepDefinition[];
  /** 1-based index of the current step. */
  currentStep: number;
  /** Fired only for steps strictly before the current one — the stepper
   *  never allows jumping ahead. */
  onStepClick?: (step: number) => void;
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  const progressPercent =
    steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex items-start justify-center">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isClickable = isCompleted && Boolean(onStepClick);

          return (
            <div key={step.label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <div
                    className={cn(
                      "h-px flex-1",
                      isCompleted || isActive ? "bg-primary" : "bg-border",
                    )}
                  />
                ) : null}
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
                {index < steps.length - 1 ? (
                  <div
                    className={cn(
                      "h-px flex-1",
                      stepNumber < currentStep ? "bg-primary" : "bg-border",
                    )}
                  />
                ) : null}
              </div>
              <span
                className={cn(
                  "mt-2 text-center text-xs font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 h-0.5 w-full rounded-full bg-border">
        <div
          className="h-0.5 rounded-full bg-primary transition-[width]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
