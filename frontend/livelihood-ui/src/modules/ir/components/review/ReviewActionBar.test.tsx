import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReviewActionBar } from "./ReviewActionBar";

function renderBar(overrides: Partial<React.ComponentProps<typeof ReviewActionBar>> = {}) {
  const onApprove = vi.fn();
  const onReject = vi.fn();
  const props: React.ComponentProps<typeof ReviewActionBar> = {
    hasAnyReason: false,
    isSubmitting: false,
    onApprove,
    onReject,
    ...overrides,
  };
  const result = render(<ReviewActionBar {...props} />);
  return { ...result, onApprove, onReject };
}

describe("ReviewActionBar", () => {
  it("enables Approve and disables Reject when there is no reason on any section", () => {
    renderBar({ hasAnyReason: false });
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
  });

  it("disables Approve and enables Reject when any section has a reason", () => {
    renderBar({ hasAnyReason: true });
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeEnabled();
  });

  it("disables both buttons while submitting, regardless of hasAnyReason", () => {
    renderBar({ hasAnyReason: false, isSubmitting: true });
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
  });

  it("fires onApprove when Approve is clicked while enabled", async () => {
    const user = userEvent.setup();
    const { onApprove } = renderBar({ hasAnyReason: false });
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it("fires onReject when Reject is clicked while enabled", async () => {
    const user = userEvent.setup();
    const { onReject } = renderBar({ hasAnyReason: true });
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
