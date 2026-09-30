import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SplitButton } from "./split-button";

describe("SplitButton", () => {
  it("renders the label", () => {
    render(<SplitButton label="Approve" />);

    expect(screen.getByText("Approve")).toBeInTheDocument();
  });

  it("calls onLabelClick when the label segment is clicked", async () => {
    const user = userEvent.setup();
    const onLabelClick = vi.fn();
    render(<SplitButton label="Approve" onLabelClick={onLabelClick} />);

    await user.click(screen.getByText("Approve"));

    expect(onLabelClick).toHaveBeenCalledTimes(1);
  });

  it("calls onTriggerClick when the chevron trigger is clicked", async () => {
    const user = userEvent.setup();
    const onTriggerClick = vi.fn();
    const onLabelClick = vi.fn();
    render(<SplitButton label="Approve" onLabelClick={onLabelClick} onTriggerClick={onTriggerClick} />);

    await user.click(screen.getByRole("button", { name: "More actions" }));

    expect(onTriggerClick).toHaveBeenCalledTimes(1);
    expect(onLabelClick).not.toHaveBeenCalled();
  });

  it("falls back to onLabelClick for the trigger when onTriggerClick isn't given", async () => {
    const user = userEvent.setup();
    const onLabelClick = vi.fn();
    render(<SplitButton label="Approve" onLabelClick={onLabelClick} />);

    await user.click(screen.getByRole("button", { name: "More actions" }));

    expect(onLabelClick).toHaveBeenCalledTimes(1);
  });

  it("uses a custom triggerAriaLabel when given", () => {
    render(<SplitButton label="Approve" triggerAriaLabel="Open approve options" />);

    expect(screen.getByRole("button", { name: "Open approve options" })).toBeInTheDocument();
  });

  it("disables both segments when disabled", () => {
    render(<SplitButton label="Approve" disabled />);

    expect(screen.getByText("Approve").closest("button")).toBeDisabled();
    expect(screen.getByRole("button", { name: "More actions" })).toBeDisabled();
  });

  it("reflects triggerAriaExpanded on the trigger button", () => {
    render(<SplitButton label="Approve" triggerAriaExpanded />);

    expect(screen.getByRole("button", { name: "More actions" })).toHaveAttribute("aria-expanded", "true");
  });
});
