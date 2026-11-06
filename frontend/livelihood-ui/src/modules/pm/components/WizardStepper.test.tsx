import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WizardStepper } from "./WizardStepper";

const steps = [{ label: "Project Details" }, { label: "Geography" }, { label: "Review" }];

describe("WizardStepper", () => {
  it("renders every step's label and number", () => {
    render(
      <WizardStepper steps={steps} currentStep={1} onStepChange={vi.fn()} isStepClickable={() => false} />,
    );

    expect(screen.getByText("Project Details")).toBeInTheDocument();
    expect(screen.getByText("Geography")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("calls onStepChange when a clickable step is clicked", async () => {
    const onStepChange = vi.fn();
    const user = userEvent.setup();
    render(
      <WizardStepper steps={steps} currentStep={2} onStepChange={onStepChange} isStepClickable={() => true} />,
    );

    await user.click(screen.getByText("Project Details"));

    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it("marks a step disabled when it isn't reachable and isn't the current step", () => {
    render(
      <WizardStepper steps={steps} currentStep={1} onStepChange={vi.fn()} isStepClickable={() => false} />,
    );

    expect(screen.getByRole("tab", { name: /Review/i })).toBeDisabled();
  });

  it("never disables the current step even when isStepClickable returns false", () => {
    render(
      <WizardStepper steps={steps} currentStep={1} onStepChange={vi.fn()} isStepClickable={() => false} />,
    );

    expect(screen.getByRole("tab", { name: /Project Details/i })).not.toBeDisabled();
  });
});
