import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReworkReasonDialog } from "./ReworkReasonDialog";

const reasonOptions = [
  { code: "UPLOADED_IMAGES_NOT_CLEAR", name: "Uploaded images are not clear" },
  { code: "OTHERS", name: "Others" },
];

function renderDialog(onSubmit = vi.fn()) {
  render(
    <ReworkReasonDialog open isSubmitting={false} reasonOptions={reasonOptions} onOpenChange={vi.fn()} onSubmit={onSubmit} />,
  );
  return onSubmit;
}

describe("ReworkReasonDialog", () => {
  it("needs at least one reason", async () => {
    const user = userEvent.setup();
    const onSubmit = renderDialog();

    await user.click(screen.getByRole("button", { name: "Send for Rework" }));

    expect(screen.getByText("Select at least one reason for rework")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("needs a comment for Others", async () => {
    const user = userEvent.setup();
    const onSubmit = renderDialog();

    await user.click(screen.getByText("Others"));
    await user.click(screen.getByRole("button", { name: "Send for Rework" }));

    expect(screen.getByText('Please add a comment for "Others"')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends each chosen reason with its own comment", async () => {
    const user = userEvent.setup();
    const onSubmit = renderDialog();

    await user.click(screen.getByText("Uploaded images are not clear"));
    await user.click(screen.getByText("Others"));
    await user.type(screen.getByRole("textbox", { name: "Comment, Others" }), "Retake the SPD photo");
    await user.click(screen.getByRole("button", { name: "Send for Rework" }));

    expect(onSubmit).toHaveBeenCalledWith([
      { reason: "UPLOADED_IMAGES_NOT_CLEAR" },
      { reason: "OTHERS", comment: "Retake the SPD photo" },
    ]);
  });
});
