/**
 * Unit tests for SplitButton (src/ui/components/ui/split-button.tsx).
 *
 * SplitButton is a pure, stateless presentational component: two joined
 * `<button>` segments (a label segment and a chevron "trigger" segment)
 * plus a decorative divider, all wrapped in a single `.group` container.
 * It holds no internal state, touches no context/provider, does no i18n,
 * and does no routing -- so these tests render it directly with RTL's
 * `render`/`screen`, with no provider wrapper and no mocking of any kind.
 * The only "mock" needed anywhere is a plain `vi.fn()` click handler.
 *
 * Behaviors/branches covered:
 *  - Renders the label content and the accessible trigger button (default
 *    aria-label "More actions", overridable via `triggerAriaLabel`).
 *  - Label segment click invokes `onLabelClick` only; trigger segment click
 *    invokes `onTriggerClick` only, when both are supplied independently.
 *  - Handler fallback: when `onTriggerClick` is omitted, clicking the
 *    trigger segment falls back to calling `onLabelClick` (the
 *    `onTriggerClick ?? onLabelClick` line in the source).
 *  - `disabled` disables both segments (and consequently neither handler
 *    fires on click, since RTL/user-event respects the native `disabled`
 *    attribute).
 *  - Chevron rotation is conditional on `triggerAriaExpanded`: absent/false
 *    renders without `rotate-180`; `true` adds it, and also sets
 *    `aria-expanded="true"` on the trigger button.
 *  - variant/size class composition: each `variant` ("default" | "outline")
 *    and `size` ("sm" | "default" | "lg") pulls from distinct lookup
 *    tables (segmentBase + SIZE_CLASSES), so we assert the size-specific
 *    height/radius classes and the variant-specific color classes land on
 *    the right elements, for a representative case per branch, rather than
 *    re-asserting the entire class string (which is layout/design detail,
 *    not the logic under test).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SplitButton } from "./split-button";

describe("SplitButton rendering", () => {
  it("renders the label content and a trigger button with the default aria-label", () => {
    render(<SplitButton label="Approve" />);

    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More actions" })).toBeInTheDocument();
  });

  it("overrides the trigger's accessible name via triggerAriaLabel", () => {
    render(<SplitButton label="Approve" triggerAriaLabel="Show approve options" />);

    expect(screen.getByRole("button", { name: "Show approve options" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
  });
});

// SplitButton wires up two independent click handlers: onLabelClick fires
// for the label segment, and handleTrigger (= onTriggerClick ?? onLabelClick)
// fires for the chevron segment. These tests verify each button dispatches
// to the correct handler, and that they are independent when both are given.
describe("SplitButton click handling", () => {
  it("calls onLabelClick when the label segment is clicked, not the trigger handler", async () => {
    const user = userEvent.setup();
    const onLabelClick = vi.fn();
    const onTriggerClick = vi.fn();
    render(
      <SplitButton label="Approve" onLabelClick={onLabelClick} onTriggerClick={onTriggerClick} />,
    );

    await user.click(screen.getByText("Approve"));

    expect(onLabelClick).toHaveBeenCalledTimes(1);
    expect(onTriggerClick).not.toHaveBeenCalled();
  });

  it("calls onTriggerClick when the trigger segment is clicked, not onLabelClick", async () => {
    const user = userEvent.setup();
    const onLabelClick = vi.fn();
    const onTriggerClick = vi.fn();
    render(
      <SplitButton label="Approve" onLabelClick={onLabelClick} onTriggerClick={onTriggerClick} />,
    );

    await user.click(screen.getByRole("button", { name: "More actions" }));

    expect(onTriggerClick).toHaveBeenCalledTimes(1);
    expect(onLabelClick).not.toHaveBeenCalled();
  });

  // Business rule under test: `const handleTrigger = onTriggerClick ?? onLabelClick`.
  // When the caller only supplies onLabelClick (no dedicated trigger handler),
  // clicking the chevron/trigger segment must still fall back to onLabelClick
  // rather than doing nothing.
  it("falls back to onLabelClick for the trigger segment when onTriggerClick is not supplied", async () => {
    const user = userEvent.setup();
    const onLabelClick = vi.fn();
    render(<SplitButton label="Approve" onLabelClick={onLabelClick} />);

    await user.click(screen.getByRole("button", { name: "More actions" }));

    expect(onLabelClick).toHaveBeenCalledTimes(1);
  });

  it("disables both segments when disabled is true, so neither handler fires", async () => {
    const user = userEvent.setup();
    const onLabelClick = vi.fn();
    const onTriggerClick = vi.fn();
    render(
      <SplitButton
        label="Approve"
        onLabelClick={onLabelClick}
        onTriggerClick={onTriggerClick}
        disabled
      />,
    );

    const labelButton = screen.getByText("Approve");
    const triggerButton = screen.getByRole("button", { name: "More actions" });
    expect(labelButton).toBeDisabled();
    expect(triggerButton).toBeDisabled();

    await user.click(labelButton);
    await user.click(triggerButton);

    expect(onLabelClick).not.toHaveBeenCalled();
    expect(onTriggerClick).not.toHaveBeenCalled();
  });
});

// The chevron rotates 180deg only while triggerAriaExpanded is truthy
// (`triggerAriaExpanded && "rotate-180"`), and the same prop is mirrored
// onto aria-expanded for accessibility -- these are two effects of one prop.
describe("SplitButton expanded/chevron state", () => {
  it("does not rotate the chevron and omits aria-expanded when triggerAriaExpanded is unset", () => {
    render(<SplitButton label="Approve" />);

    const triggerButton = screen.getByRole("button", { name: "More actions" });
    expect(triggerButton).not.toHaveAttribute("aria-expanded");
    const chevron = triggerButton.querySelector("svg");
    expect(chevron).not.toHaveClass("rotate-180");
  });

  it("rotates the chevron and sets aria-expanded=true when triggerAriaExpanded is true", () => {
    render(<SplitButton label="Approve" triggerAriaExpanded />);

    const triggerButton = screen.getByRole("button", { name: "More actions" });
    expect(triggerButton).toHaveAttribute("aria-expanded", "true");
    const chevron = triggerButton.querySelector("svg");
    expect(chevron).toHaveClass("rotate-180");
  });

  it("sets aria-expanded=false and no rotation when triggerAriaExpanded is explicitly false", () => {
    render(<SplitButton label="Approve" triggerAriaExpanded={false} />);

    const triggerButton = screen.getByRole("button", { name: "More actions" });
    expect(triggerButton).toHaveAttribute("aria-expanded", "false");
    const chevron = triggerButton.querySelector("svg");
    expect(chevron).not.toHaveClass("rotate-180");
  });
});

// SIZE_CLASSES is a lookup table keyed by size ("sm" | "default" | "lg") that
// drives height/radius/padding/text/gap classes on both segments. Default
// size is "default" when the prop is omitted.
describe("SplitButton size class composition", () => {
  it("applies the default size's height and radius classes when size is omitted", () => {
    render(<SplitButton label="Approve" />);

    const labelButton = screen.getByText("Approve");
    const triggerButton = screen.getByRole("button", { name: "More actions" });
    expect(labelButton).toHaveClass("h-11", "rounded-l-[10px]", "px-6", "text-lg");
    expect(triggerButton).toHaveClass("h-11", "rounded-r-[10px]", "px-3");
  });

  it("applies the sm size's height and radius classes", () => {
    render(<SplitButton label="Approve" size="sm" />);

    const labelButton = screen.getByText("Approve");
    const triggerButton = screen.getByRole("button", { name: "More actions" });
    expect(labelButton).toHaveClass("h-8", "rounded-l-md", "px-3", "text-sm");
    expect(triggerButton).toHaveClass("h-8", "rounded-r-md", "px-2");
  });

  it("applies the lg size's height and radius classes", () => {
    render(<SplitButton label="Approve" size="lg" />);

    const labelButton = screen.getByText("Approve");
    const triggerButton = screen.getByRole("button", { name: "More actions" });
    expect(labelButton).toHaveClass("h-10", "rounded-l-lg", "px-4", "text-sm");
    expect(triggerButton).toHaveClass("h-10", "rounded-r-lg", "px-3");
  });
});

// variant switches each segment between the "default" (filled brand color)
// and "outline" (bordered, transparent-fill) class branches. Default variant
// is "default" when the prop is omitted.
describe("SplitButton variant class composition", () => {
  it("applies filled brand-primary classes for the default variant", () => {
    render(<SplitButton label="Approve" />);

    const labelButton = screen.getByText("Approve");
    const triggerButton = screen.getByRole("button", { name: "More actions" });
    expect(labelButton).toHaveClass("bg-brand-primary", "text-neutral-25");
    expect(triggerButton).toHaveClass("bg-brand-primary", "text-neutral-25");
  });

  it("applies bordered/transparent classes for the outline variant", () => {
    render(<SplitButton label="Approve" variant="outline" />);

    const labelButton = screen.getByText("Approve");
    const triggerButton = screen.getByRole("button", { name: "More actions" });
    expect(labelButton).toHaveClass("border", "border-r-0", "border-brand-primary", "text-brand-primary");
    expect(triggerButton).toHaveClass("border", "border-l-0", "border-brand-primary", "text-brand-primary");
    expect(labelButton).not.toHaveClass("bg-brand-primary");
  });
});
