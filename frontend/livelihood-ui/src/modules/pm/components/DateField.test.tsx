import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DateField } from "./DateField";

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

describe("DateField", () => {
  it("shows the placeholder text when no value is set", () => {
    render(<DateField label="Start Date" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Select date/i })).toBeInTheDocument();
  });

  it("shows the formatted date when a value is set", () => {
    render(<DateField label="Start Date" value={1768435200000} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /15 Jan 2026/i })).toBeInTheDocument();
  });

  it("marks the label as required with an asterisk", () => {
    render(<DateField label="Start Date" required onChange={vi.fn()} />);

    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows the error message when given one", () => {
    render(<DateField label="Start Date" onChange={vi.fn()} error="Start date is required" />);

    expect(screen.getByText("Start date is required")).toBeInTheDocument();
  });

  it("disables the trigger button when disabled", () => {
    render(<DateField label="Start Date" onChange={vi.fn()} disabled />);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("opens the calendar and calls onChange with the picked date's timestamp", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DateField label="Start Date" value={1768435200000} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /15 Jan 2026/i }));
    const day16 = document.querySelector('[data-day="2026-01-16"] button');
    expect(day16).not.toBeNull();
    await user.click(day16!);

    expect(onChange).toHaveBeenCalledWith(expect.any(Number));
  });
});
