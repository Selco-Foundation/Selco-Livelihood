/**
 * Unit tests for Checkbox (src/ui/components/ui/checkbox.tsx).
 *
 * Checkbox is a thin styling wrapper around Radix's
 * `CheckboxPrimitive.Root` / `CheckboxPrimitive.Indicator` (imported from the
 * `radix-ui` umbrella package): it forwards all props to the Radix root,
 * merges caller `className` onto the default Tailwind classes via `cn`, and
 * renders a lucide `CheckIcon` inside the indicator. All checked/unchecked/
 * disabled/keyboard behavior is Radix's own state machine, not custom logic
 * in this file -- so these tests render the real Radix primitive (no mocking
 * of Radix) and assert on the `role="checkbox"` element's `aria-checked` /
 * `data-state` attributes and on whether the check icon is present in the
 * DOM, both in uncontrolled (internal state) and controlled
 * (`checked` + `onCheckedChange`) usage. The component does no i18n and
 * touches no router/query context, so no provider wrapper is used -- plain
 * RTL `render`/`screen` plus `@testing-library/user-event` for interaction.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";

// Uncontrolled usage: Radix's Checkbox.Root manages its own checked state
// internally when no `checked` prop is supplied. Default render should be
// unchecked, expose that via both `aria-checked` and `data-state` (used by
// the component's `data-[state=checked]:*` Tailwind variants), and Radix's
// Indicator should not mount the CheckIcon's <svg> while unchecked.
describe("Checkbox default (uncontrolled) rendering", () => {
  it("renders unchecked with no check icon by default", () => {
    render(<Checkbox aria-label="agree" />);

    const checkbox = screen.getByRole("checkbox", { name: "agree" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    expect(checkbox).toHaveAttribute("data-state", "unchecked");
    expect(checkbox.querySelector("svg")).not.toBeInTheDocument();
  });

  it("toggles to checked and mounts the check icon when clicked", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="agree" />);

    const checkbox = screen.getByRole("checkbox", { name: "agree" });
    await user.click(checkbox);

    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(checkbox).toHaveAttribute("data-state", "checked");
    expect(checkbox.querySelector("svg")).toBeInTheDocument();
  });

  it("toggles back to unchecked on a second click", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="agree" />);

    const checkbox = screen.getByRole("checkbox", { name: "agree" });
    await user.click(checkbox);
    await user.click(checkbox);

    expect(checkbox).toHaveAttribute("aria-checked", "false");
    expect(checkbox).toHaveAttribute("data-state", "unchecked");
    expect(checkbox.querySelector("svg")).not.toBeInTheDocument();
  });

  // Radix's keyboard support toggles the checkbox on Space when it has
  // focus, independent of any click handler -- verifying this exercises the
  // real Radix state machine rather than a synthetic click event.
  it("toggles via the keyboard (Space) once focused", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="agree" />);

    const checkbox = screen.getByRole("checkbox", { name: "agree" });
    checkbox.focus();
    await user.keyboard(" ");

    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(checkbox).toHaveAttribute("data-state", "checked");
  });
});

// Controlled usage: when the caller supplies `checked` + `onCheckedChange`,
// Radix defers to the caller's state entirely -- clicking fires the
// callback with the next boolean value, but the rendered state only changes
// once the caller re-renders with an updated `checked` prop.
describe("Checkbox controlled usage", () => {
  it("reflects the checked prop and calls onCheckedChange(true) when clicked from unchecked", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="agree" checked={false} onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByRole("checkbox", { name: "agree" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");

    await user.click(checkbox);

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    // No internal state update happened since the prop wasn't changed by
    // the (mocked) caller -- the DOM should still read unchecked.
    expect(checkbox).toHaveAttribute("aria-checked", "false");
  });

  it("renders as checked and calls onCheckedChange(false) when clicked from checked", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="agree" checked={true} onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByRole("checkbox", { name: "agree" });
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(checkbox.querySelector("svg")).toBeInTheDocument();

    await user.click(checkbox);

    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  // Radix's tri-state `checked="indeterminate"` maps to a distinct
  // `data-state="indeterminate"` (neither the checked nor unchecked variant
  // classes apply) and to `aria-checked="mixed"` per the checkbox a11y spec.
  it("renders the indeterminate state distinctly from checked/unchecked", () => {
    render(<Checkbox aria-label="agree" checked="indeterminate" />);

    const checkbox = screen.getByRole("checkbox", { name: "agree" });
    expect(checkbox).toHaveAttribute("aria-checked", "mixed");
    expect(checkbox).toHaveAttribute("data-state", "indeterminate");
  });
});

// `disabled` is forwarded straight to the native/Radix button element:
// Radix marks it `data-disabled` and blocks the click/keyboard handlers
// that would otherwise flip state, so neither the DOM state nor any
// supplied callback changes.
describe("Checkbox disabled state", () => {
  it("does not toggle or call onCheckedChange when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="agree" disabled onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByRole("checkbox", { name: "agree" });
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveAttribute("data-disabled");

    await user.click(checkbox);

    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(checkbox).toHaveAttribute("aria-checked", "false");
  });
});

// The component always stamps `data-slot="checkbox"` on the root (used as a
// styling/selector hook elsewhere) and merges any caller-supplied
// `className` onto its default class string via `cn`, rather than replacing
// the defaults outright.
describe("Checkbox slot attribute and className merging", () => {
  it("stamps data-slot=checkbox on the root element", () => {
    render(<Checkbox aria-label="agree" />);

    expect(screen.getByRole("checkbox", { name: "agree" })).toHaveAttribute(
      "data-slot",
      "checkbox",
    );
  });

  it("merges a custom className with the default classes instead of replacing them", () => {
    render(<Checkbox aria-label="agree" className="my-custom-class" />);

    const checkbox = screen.getByRole("checkbox", { name: "agree" });
    expect(checkbox).toHaveClass("my-custom-class");
    expect(checkbox).toHaveClass("peer", "size-4", "shrink-0", "rounded-[4px]");
  });
});
