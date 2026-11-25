import { fireEvent, render, screen } from "@testing-library/react";
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

  it("does not send comments that are too long together, and says how much to remove", async () => {
    const user = userEvent.setup();
    const longReasons = ["A", "B", "OTHERS"].map((code) => ({ code, name: `Reason ${code}` }));
    const onSubmit = vi.fn();
    render(<ReworkReasonDialog open isSubmitting={false} reasonOptions={longReasons} onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    for (const { name } of longReasons) {
      await user.click(screen.getByText(name));
      fireEvent.change(screen.getByRole("textbox", { name: `Comment, ${name}` }), { target: { value: "x".repeat(400) } });
    }

    expect(screen.getByText(/^The comments are too long together\. Remove \d+ characters\.$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send for Rework" })).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "Comment, Reason A" }), { target: { value: "" } });
    expect(screen.getByText(/characters left for all comments together$/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send for Rework" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
