import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmActionDialog } from "./ConfirmActionDialog";

function renderDialog(overrides: Partial<React.ComponentProps<typeof ConfirmActionDialog>> = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  const props: React.ComponentProps<typeof ConfirmActionDialog> = {
    action: "APPROVE",
    isSubmitting: false,
    onCancel,
    onConfirm,
    ...overrides,
  };
  const result = render(<ConfirmActionDialog {...props} />);
  return { ...result, onCancel, onConfirm };
}

describe("ConfirmActionDialog", () => {
  it("does not render the dialog content when action is null", () => {
    renderDialog({ action: null });
    expect(screen.queryByText("Approve this report?")).not.toBeInTheDocument();
    expect(screen.queryByText("Reject this report?")).not.toBeInTheDocument();
  });

  it("shows the approve title when action is APPROVE", () => {
    renderDialog({ action: "APPROVE" });
    expect(screen.getByText("Approve this report?")).toBeInTheDocument();
  });

  it("shows the reject title when action is REJECT", () => {
    renderDialog({ action: "REJECT" });
    expect(screen.getByText("Reject this report?")).toBeInTheDocument();
  });

  it("fires onConfirm when the confirm button is clicked", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("fires onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables both buttons while submitting", () => {
    renderDialog({ isSubmitting: true });
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("enables both buttons when not submitting", () => {
    renderDialog({ isSubmitting: false });
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });
});
