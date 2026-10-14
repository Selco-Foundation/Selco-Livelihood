import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PasswordChangedDialog } from "./PasswordChangedDialog";

describe("PasswordChangedDialog", () => {
  it("renders the success title and description fallback text", () => {
    render(<PasswordChangedDialog onConfirm={vi.fn()} />);

    expect(screen.getByText("Password updated successfully")).toBeInTheDocument();
    expect(screen.getByText("Please log in again using your new password.")).toBeInTheDocument();
  });

  it("renders an OK button", () => {
    render(<PasswordChangedDialog onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  it("calls onConfirm when the OK button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<PasswordChangedDialog onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
