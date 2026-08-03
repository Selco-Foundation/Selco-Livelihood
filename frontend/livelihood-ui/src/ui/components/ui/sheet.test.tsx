/**
 * Unit tests for the Sheet wrapper (src/ui/components/ui/sheet.tsx).
 *
 * This file is a thin styling/composition wrapper around Radix's `Dialog`
 * primitives (imported as `SheetPrimitive` from the unified `radix-ui`
 * package) -- it is a side-panel variant of a dialog, not a distinct Radix
 * primitive. Each exported component (`Sheet`, `SheetTrigger`, `SheetClose`,
 * `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`,
 * `SheetDescription`) forwards props to the matching Radix primitive (or a
 * plain `<div>` for Header/Footer), adding:
 *   - a `data-slot="sheet-*"` marker on every part,
 *   - default Tailwind classes merged with any caller-supplied `className`
 *     via `cn` (append, not replace),
 *   - `SheetContent`'s own logic: it always wraps `children` in a
 *     `SheetPortal` + `SheetOverlay`, picks side-dependent classes off a
 *     `side` prop (defaulting to `"right"`, one of `"top" | "right" |
 *     "bottom" | "left"`), and conditionally renders a built-in close
 *     button (an `XIcon` plus screen-reader-only "Close" text) unless
 *     `showCloseButton={false}` is passed.
 *
 * These tests exercise this wrapper's own contribution -- open/close
 * plumbing via Radix's uncontrolled Dialog state, className merging,
 * data-slot markers, the `side` prop's class branching, and the
 * `showCloseButton` on/off branch -- not Radix's internal focus-trap or
 * animation behavior. The component tree has no i18n, routing, or
 * query-client dependency of its own (confirmed by reading the source), so
 * tests render it directly with RTL's `render`/`screen` and no provider
 * wrapper, mirroring alert-dialog.test.tsx's approach to the sibling Radix
 * Dialog-family wrapper. Radix's Dialog.Content renders with `role="dialog"`
 * and mounts through a Portal only after the trigger opens it, so assertions
 * on it use async `findByRole`/`findBy*` queries.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

function renderSheet(overrides?: {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
  contentClassName?: string;
}) {
  return render(
    <Sheet>
      <SheetTrigger>Open menu</SheetTrigger>
      <SheetContent
        side={overrides?.side}
        showCloseButton={overrides?.showCloseButton}
        className={overrides?.contentClassName}
      >
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Choose a destination.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose>Dismiss</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>,
  );
}

// Sheet/SheetTrigger/SheetContent together implement Radix Dialog's
// uncontrolled open/close flow: the primitive starts closed, and clicking
// the trigger renders Content (plus its Overlay, via a Portal) with
// role="dialog". This describes that plumbing still works through the
// wrapper's prop forwarding.
describe("Sheet open/close flow", () => {
  it("renders only the trigger until it is activated", () => {
    renderSheet();

    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the sheet and renders its title, description and footer content when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Choose a destination.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("closes the sheet when SheetClose is activated", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// SheetContent's showCloseButton prop (default true) conditionally renders a
// built-in close button (XIcon + sr-only "Close" text) inside the content,
// separate from any caller-supplied SheetClose. This is the wrapper's own
// branch, not something Radix's Dialog.Content provides on its own.
describe("SheetContent showCloseButton branch", () => {
  it("renders the built-in close button by default", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("dialog");

    // The built-in close button's accessible name comes from the sr-only
    // "Close" span, distinguishing it from the caller-supplied "Dismiss"
    // SheetClose button rendered in the footer.
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("omits the built-in close button when showCloseButton is false", async () => {
    const user = userEvent.setup();
    renderSheet({ showCloseButton: false });

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("dialog");

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    // The caller's own SheetClose button in the footer is unaffected.
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });
});

// SheetContent's `side` prop (default "right") selects a distinct set of
// positioning/slide-direction classes for each of the four supported edges.
// Only one branch of the side===... chain can be true at a time, so
// asserting the class list for each value confirms the branching picks the
// correct one and does not leak classes from the others.
describe("SheetContent side prop class branching", () => {
  it("applies the right-side classes by default when side is not specified", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveClass("inset-y-0", "right-0", "border-l", "data-[state=open]:slide-in-from-right");
    expect(dialog).not.toHaveClass("left-0", "inset-x-0");
  });

  it.each([
    {
      side: "left" as const,
      expectedClasses: ["inset-y-0", "left-0", "border-r", "data-[state=open]:slide-in-from-left"],
    },
    {
      side: "top" as const,
      expectedClasses: ["inset-x-0", "top-0", "border-b", "data-[state=open]:slide-in-from-top"],
    },
    {
      side: "bottom" as const,
      expectedClasses: ["inset-x-0", "bottom-0", "border-t", "data-[state=open]:slide-in-from-bottom"],
    },
  ])("applies the $side-side classes when side=\"$side\"", async ({ side, expectedClasses }) => {
    const user = userEvent.setup();
    renderSheet({ side });

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveClass(...expectedClasses);
  });
});

// Every styled subcomponent merges its default Tailwind classes with a
// caller-supplied `className` via `cn(...)` (append, not replace) and stamps
// a `data-slot` marker identifying which part of the sheet it is. These are
// the wrapper's only real styling contribution over the bare Radix
// primitives, so we assert both the merge behavior and the markers.
describe("Sheet className merging and data-slot markers", () => {
  it("merges a custom className onto SheetContent alongside its default classes", async () => {
    const user = userEvent.setup();
    renderSheet({ contentClassName: "custom-content-class" });

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveClass("custom-content-class");
    // Default classes must still be present -- proves cn() appends rather
    // than overwrites the built-in styling.
    expect(dialog).toHaveClass("fixed", "z-50", "flex", "flex-col");
    expect(dialog).toHaveAttribute("data-slot", "sheet-content");
  });

  it("stamps data-slot markers on the trigger, header, footer, title and description", async () => {
    const user = userEvent.setup();
    renderSheet();

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("data-slot", "sheet-trigger");

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("dialog");

    expect(screen.getByText("Navigation")).toHaveAttribute("data-slot", "sheet-title");
    expect(screen.getByText("Choose a destination.")).toHaveAttribute("data-slot", "sheet-description");
    expect(screen.getByText("Navigation").closest('[data-slot="sheet-header"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: "Dismiss" }).closest('[data-slot="sheet-footer"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveAttribute("data-slot", "sheet-close");
  });
});
