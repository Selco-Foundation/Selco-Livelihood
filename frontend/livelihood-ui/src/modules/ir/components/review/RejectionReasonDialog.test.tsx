import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RejectionReasonOption } from "../../types/activity-review";
import { RejectionReasonDialog, type RejectionReasonDraft } from "./RejectionReasonDialog";

// Radix Select relies on pointer-capture and scroll APIs jsdom doesn't
// implement; stub them so the trigger can be opened via userEvent.
beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

const reasonOptions: RejectionReasonOption[] = [
  { code: "DAMAGED", name: "Damaged" },
  { code: "OTHER", name: "Other" },
];

function renderDialog(overrides: Partial<React.ComponentProps<typeof RejectionReasonDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn();
  const onDelete = vi.fn();
  const props: React.ComponentProps<typeof RejectionReasonDialog> = {
    open: true,
    onOpenChange,
    reasonOptions,
    onSubmit,
    onDelete,
    ...overrides,
  };
  const result = render(<RejectionReasonDialog {...props} />);
  return { ...result, onOpenChange, onSubmit, onDelete };
}

async function selectReason(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("combobox"));
  await user.click(await screen.findByRole("option", { name }));
}

describe("RejectionReasonDialog", () => {
  it("does not render dialog content when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByText("Add rejection reason")).not.toBeInTheDocument();
  });

  it("shows the Add title and no Delete button when adding a new reason", () => {
    renderDialog();
    expect(screen.getByText("Add rejection reason")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("shows the Edit title, a Delete button, and prefilled values when editing", () => {
    const initialValue: RejectionReasonDraft = {
      reasonCode: "DAMAGED",
      reasonLabel: "Damaged",
      comment: "Cracked panel",
    };
    renderDialog({ initialValue });
    expect(screen.getByText("Edit rejection reason")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cracked panel")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Damaged");
  });

  it("disables the save button until a reason is selected", async () => {
    const user = userEvent.setup();
    renderDialog();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

    await selectReason(user, "Damaged");

    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("submits the selected reason and trimmed comment, then closes", async () => {
    const user = userEvent.setup();
    const { onSubmit, onOpenChange } = renderDialog();

    await selectReason(user, "Damaged");
    await user.type(screen.getByPlaceholderText("Add details for this reason"), "  Cracked panel  ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledWith({
      reasonCode: "DAMAGED",
      reasonLabel: "Damaged",
      comment: "Cracked panel",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submits with an empty comment for a non-Other reason", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    await selectReason(user, "Damaged");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledWith({ reasonCode: "DAMAGED", reasonLabel: "Damaged", comment: "" });
  });

  it("blocks saving an Other reason with no comment, showing an error and not calling onSubmit", async () => {
    const user = userEvent.setup();
    const { onSubmit, onOpenChange } = renderDialog();

    await selectReason(user, "Other");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Please add a comment for this reason")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("allows saving an Other reason once a comment is provided", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    await selectReason(user, "Other");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("Please add a comment for this reason")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Add details for this reason"), "Needs more detail");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledWith({
      reasonCode: "OTHER",
      reasonLabel: "Other",
      comment: "Needs more detail",
    });
  });

  it("clears the comment error once the reason selection changes", async () => {
    const user = userEvent.setup();
    renderDialog();

    await selectReason(user, "Other");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("Please add a comment for this reason")).toBeInTheDocument();

    await selectReason(user, "Damaged");

    expect(screen.queryByText("Please add a comment for this reason")).not.toBeInTheDocument();
  });

  it("fires onDelete and closes when Delete is clicked in edit mode", async () => {
    const user = userEvent.setup();
    const { onDelete, onOpenChange } = renderDialog({
      initialValue: { reasonCode: "DAMAGED", reasonLabel: "Damaged", comment: "" },
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes without submitting when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const { onSubmit, onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
