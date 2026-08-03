/**
 * Unit tests for the Popover wrapper (src/ui/components/ui/popover.tsx).
 *
 * This file is a thin styling/composition wrapper around Radix's `Popover`
 * primitives (`Popover.Root`, `Popover.Trigger`, `Popover.Anchor`,
 * `Popover.Portal`, `Popover.Content`), imported from the unified `radix-ui`
 * package. Each exported component (`Popover`, `PopoverTrigger`,
 * `PopoverAnchor`, `PopoverContent`) just forwards its props to the matching
 * Radix primitive, adding a `data-slot="popover-*"` marker; `PopoverContent`
 * additionally renders through `Popover.Portal`, defaults `align="center"`
 * and `sideOffset={4}` when the caller doesn't override them, and merges its
 * default Tailwind classes with any caller-supplied `className` via `cn`
 * (append, not replace).
 *
 * All open/close state, keyboard dismissal (Escape), outside-click
 * dismissal, and `aria-*`/`data-*` wiring is Radix's own uncontrolled or
 * controlled state machine -- not custom logic in this file -- so these
 * tests render the real Radix primitives (no mocking of Radix) and drive
 * them with `@testing-library/user-event`, using async `findByRole` queries
 * for the popover content since `PopoverContent` only mounts into the DOM
 * (through a Portal) once the popover opens. The component has no i18n,
 * routing, or query-client dependency of its own (confirmed by reading the
 * source), so no provider wrapper from src/test/render-with-providers.tsx is
 * used -- plain RTL `render`/`screen` is sufficient, matching the sibling
 * alert-dialog.test.tsx / checkbox.test.tsx convention for other bare Radix
 * wrappers in this directory.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./popover";

function renderInfoPopover(overrides?: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentClassName?: string;
}) {
  return render(
    <Popover open={overrides?.open} onOpenChange={overrides?.onOpenChange}>
      <PopoverTrigger>Open info</PopoverTrigger>
      <PopoverContent className={overrides?.contentClassName}>Helpful details</PopoverContent>
    </Popover>,
  );
}

// Popover/PopoverTrigger/PopoverContent together implement Radix's
// uncontrolled open/close flow: with no `open` prop, the primitive tracks
// its own state starting closed. The trigger always carries
// `aria-haspopup="dialog"` and `aria-expanded` reflecting that state;
// PopoverContent (rendered through a Portal) only mounts once open, with
// `role="dialog"`, and Escape (Radix's dismissable-layer behavior) closes it
// again.
describe("Popover open/close flow", () => {
  it("renders only the trigger until it is activated", () => {
    renderInfoPopover();

    const trigger = screen.getByRole("button", { name: "Open info" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the popover and renders its content when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderInfoPopover();

    const trigger = screen.getByRole("button", { name: "Open info" });
    await user.click(trigger);

    const content = await screen.findByRole("dialog");
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent("Helpful details");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // aria-controls should point at the now-open content's id, tying the
    // trigger to the specific popover it discloses.
    expect(trigger).toHaveAttribute("aria-controls", content.id);
  });

  // Radix's dismissable layer wires Escape to close the popover regardless
  // of where the caller's own onEscapeKeyDown (none here) is set -- this is
  // the default behavior inherited through the wrapper's straight prop
  // forwarding.
  it("closes the popover when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderInfoPopover();

    await user.click(screen.getByRole("button", { name: "Open info" }));
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open info" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  // Popover defaults to Radix's non-modal mode (no `modal` prop is forwarded
  // by this wrapper), so a pointerdown outside the content's boundary is not
  // blocked and instead dismisses the popover -- distinct from AlertDialog's
  // modal behavior, which traps focus and ignores outside clicks.
  it("closes the popover when clicking outside of it", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Popover>
          <PopoverTrigger>Open info</PopoverTrigger>
          <PopoverContent>Helpful details</PopoverContent>
        </Popover>
        <button type="button">Outside button</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Open info" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Outside button" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// When the caller supplies `open` + `onOpenChange`, Radix defers entirely to
// the caller's own state: clicking the trigger fires the callback with the
// next boolean value, but the rendered open/closed state only changes once
// the caller re-renders with an updated `open` prop -- mirroring the
// controlled-usage contract verified for Checkbox's `checked` prop.
describe("Popover controlled usage", () => {
  it("stays closed and calls onOpenChange(true) when the trigger is clicked while open=false", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInfoPopover({ open: false, onOpenChange });

    await user.click(screen.getByRole("button", { name: "Open info" }));

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // No internal state update happened since the prop wasn't changed by
    // the (mocked) caller -- the content should still be absent.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the content immediately when open=true is passed, with no click needed", async () => {
    renderInfoPopover({ open: true, onOpenChange: vi.fn() });

    const content = await screen.findByRole("dialog");
    expect(content).toHaveTextContent("Helpful details");
  });

  it("calls onOpenChange(false) when Escape is pressed while open=true", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderInfoPopover({ open: true, onOpenChange });

    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Controlled: the prop was never updated by the (mocked) caller, so the
    // content remains mounted despite the dismissal request.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// PopoverContent's own contribution over the bare Radix primitive: it always
// renders through a Portal, stamps `data-slot="popover-content"`, defaults
// `align="center"`/`sideOffset={4}` when the caller omits them, and merges a
// caller `className` onto its default Tailwind classes via `cn` (append, not
// replace). Popover/PopoverTrigger/PopoverAnchor add only their own
// `data-slot` marker with no other logic.
describe("PopoverContent styling, defaults and data-slot markers", () => {
  it("stamps data-slot markers on the trigger and content", async () => {
    const user = userEvent.setup();
    renderInfoPopover();

    expect(screen.getByRole("button", { name: "Open info" })).toHaveAttribute(
      "data-slot",
      "popover-trigger",
    );

    await user.click(screen.getByRole("button", { name: "Open info" }));
    const content = await screen.findByRole("dialog");

    expect(content).toHaveAttribute("data-slot", "popover-content");
  });

  it("merges a custom className onto PopoverContent alongside its default classes", async () => {
    const user = userEvent.setup();
    renderInfoPopover({ contentClassName: "custom-content-class" });

    await user.click(screen.getByRole("button", { name: "Open info" }));
    const content = await screen.findByRole("dialog");

    expect(content).toHaveClass("custom-content-class");
    // Default classes must still be present -- proves cn() appends rather
    // than overwrites the built-in styling.
    expect(content).toHaveClass("w-72", "rounded-md", "border", "border-border");
  });

  // With no `align`/`sideOffset` supplied, the wrapper's own defaults
  // (align="center", sideOffset={4}) must reach the underlying Radix
  // Popper content, which republishes the resolved side/align it actually
  // placed at as `data-side`/`data-align` attributes.
  it("applies the default align (center) and sideOffset when the caller doesn't override them", async () => {
    const user = userEvent.setup();
    renderInfoPopover();

    await user.click(screen.getByRole("button", { name: "Open info" }));
    const content = await screen.findByRole("dialog");

    expect(content).toHaveAttribute("data-align", "center");
    expect(content).toHaveAttribute("data-side");
  });

  it("forwards a caller-supplied align override instead of the default", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Open info</PopoverTrigger>
        <PopoverContent align="start">Helpful details</PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Open info" }));
    const content = await screen.findByRole("dialog");

    expect(content).toHaveAttribute("data-align", "start");
  });
});

// PopoverAnchor lets the caller decouple the element the popover is
// positioned against from the element that toggles it (the trigger can stay
// elsewhere in the tree). This wrapper adds nothing beyond the
// `data-slot="popover-anchor"` marker and prop forwarding, so the test
// confirms the marker is stamped and that opening still works normally with
// an anchor present.
describe("PopoverAnchor composition", () => {
  it("stamps data-slot=popover-anchor and still opens content via a separate trigger", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverAnchor data-testid="anchor-box">Anchor point</PopoverAnchor>
        <PopoverTrigger>Open info</PopoverTrigger>
        <PopoverContent>Helpful details</PopoverContent>
      </Popover>,
    );

    expect(screen.getByTestId("anchor-box")).toHaveAttribute("data-slot", "popover-anchor");

    await user.click(screen.getByRole("button", { name: "Open info" }));
    const content = await screen.findByRole("dialog");

    expect(content).toHaveTextContent("Helpful details");
  });
});
