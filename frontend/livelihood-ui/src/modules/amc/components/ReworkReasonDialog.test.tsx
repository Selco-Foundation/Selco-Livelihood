import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReworkReasonDialog } from "./ReworkReasonDialog";

describe("ReworkReasonDialog", () => {
  it("does not submit without a reason and says why", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ReworkReasonDialog open isSubmitting={false} onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Send for Rework" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Please enter a reason for rework")).toBeInTheDocument();
  });

  it("submits the trimmed reason", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ReworkReasonDialog open isSubmitting={false} onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Reason/), "  Retake the photo  ");
    await user.click(screen.getByRole("button", { name: "Send for Rework" }));

    expect(onSubmit).toHaveBeenCalledWith("Retake the photo");
  });
});
