import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmBulkApproveDialog } from "./ConfirmBulkApproveDialog";

function renderDialog(overrides: Partial<React.ComponentProps<typeof ConfirmBulkApproveDialog>> = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  const props = {
    open: true,
    count: 3,
    isSubmitting: false,
    onCancel,
    onConfirm,
    ...overrides,
  };
  const result = render(<ConfirmBulkApproveDialog {...props} />);
  return { ...result, onCancel, onConfirm };
}

describe("ConfirmBulkApproveDialog", () => {
  it("renders the dialog content when open", () => {
    renderDialog({ open: true });
    expect(screen.getByText("Approve selected activities?")).toBeInTheDocument();
  });

  it("does not render the dialog content when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByText("Approve selected activities?")).not.toBeInTheDocument();
  });

  it("shows the count in the description", () => {
    renderDialog({ count: 7 });
    expect(screen.getByText(/7/)).toBeInTheDocument();
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
