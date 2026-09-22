import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper";
import { cn } from "@/ui";
import { Check } from "lucide-react";

interface WizardStepperProps {
  /** Step labels, already translated, in order. */
  steps: Array<{ label: string }>;
  /** 1-based. */
  currentStep: number;
  onStepChange: (step: number) => void;
  /** Whether a given 1-based step can be jumped to. The current step is never passed here —
   *  it is always rendered as reachable-but-not-clickable. */
  isStepClickable: (step: number) => boolean;
  /**
   * Treat every step other than the current one as completed, regardless of position. Used once
   * the record is published/finalised and the wizard is a read-only record of finished work.
   */
  allCompleted?: boolean;
}

/** The step header shared by both PM wizards. */
export function WizardStepper({
  steps,
  currentStep,
  onStepChange,
  isStepClickable,
  allCompleted = false,
}: WizardStepperProps) {
  return (
    <div className="livelihood-card w-full p-6">
      <Stepper value={currentStep} onValueChange={onStepChange} indicators={{ completed: <Check className="size-3.5" /> }}>
        <StepperNav>
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCurrent = stepNumber === currentStep;
            const isClickable = !isCurrent && isStepClickable(stepNumber);

            return (
              <StepperItem
                key={step.label}
                step={stepNumber}
                // Everything before the current step is completed by the stepper's own rule; this
                // forces the ones *after* it too once the record is finalised. Never the current
                // step, so its own number stays visible to show which page you are on.
                completed={allCompleted && !isCurrent ? true : undefined}
                // Only genuinely unreachable steps look disabled. Being on the current step is not
                // a restriction, just where you are, and marking it disabled dimmed the one step
                // that should read as most prominent.
                disabled={!isCurrent && !isClickable}
                className="relative flex-1 items-start"
              >
                <StepperTrigger className="flex flex-col items-center gap-2">
                  <StepperIndicator className={isCurrent ? "ring-2 ring-primary ring-offset-2" : undefined}>
                    {stepNumber}
                  </StepperIndicator>
                  <StepperTitle>{step.label}</StepperTitle>
                </StepperTrigger>

                {steps.length > stepNumber ? (
                  <StepperSeparator
                    className={cn(
                      "group-data-[state=completed]/step:bg-primary absolute inset-x-0 top-3 left-[calc(50%+0.875rem)] m-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-2rem+0.225rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none",
                      // Once finalised every step is genuinely done, so the current step's outgoing
                      // line is green too. While still a draft the current step is *not* done, so
                      // its line stays grey — otherwise the stepper claims progress past where you
                      // have actually got to.
                      allCompleted && "group-data-[state=active]/step:bg-primary",
                    )}
                  />
                ) : null}
              </StepperItem>
            );
          })}
        </StepperNav>
      </Stepper>
    </div>
  );
}
