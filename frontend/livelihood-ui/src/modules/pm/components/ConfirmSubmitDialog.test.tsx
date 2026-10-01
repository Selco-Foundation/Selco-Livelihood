import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmSubmitDialog } from "./ConfirmSubmitDialog";

function renderDialog(overrides: Partial<React.ComponentProps<typeof ConfirmSubmitDialog>> = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  const props: React.ComponentProps<typeof ConfirmSubmitDialog> = {
    open: true,
    isSubmitting: false,
    descriptionKey: "ES_PM_PUBLISH_DESC",
    descriptionFallback: "Publishing cannot be undone.",
    onCancel,
    onConfirm,
    ...overrides,
  };
  const result = render(<ConfirmSubmitDialog {...props} />);
  return { ...result, onCancel, onConfirm };
}

describe("ConfirmSubmitDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog({ open: false });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows the description fallback text", () => {
    renderDialog();

    expect(screen.getByText("Publishing cannot be undone.")).toBeInTheDocument();
  });

  it("shows the error message when given one", () => {
    renderDialog({ errorMessage: "REVIEWER_MISSING" });

    expect(screen.getByText("REVIEWER_MISSING")).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onConfirm when Confirm & Submit is clicked", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Confirm & Submit" }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it("disables both actions while submitting", () => {
    renderDialog({ isSubmitting: true });

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirm & Submit" })).toBeDisabled();
  });
});
