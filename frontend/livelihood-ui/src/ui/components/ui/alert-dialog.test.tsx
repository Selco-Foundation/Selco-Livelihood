/**
 * Unit tests for the AlertDialog wrapper (src/ui/components/ui/alert-dialog.tsx).
 *
 * This file is a thin styling/composition wrapper around Radix's
 * `AlertDialog` primitives (imported from the unified `radix-ui` package).
 * Each exported component (`AlertDialog`, `AlertDialogTrigger`,
 * `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogContent`,
 * `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`,
 * `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`) just
 * forwards props to the matching Radix primitive (or a plain `<div>` for
 * Header/Footer), adding:
 *   - a `data-slot="alert-dialog-*"` marker,
 *   - default Tailwind classes merged with any caller-supplied `className`
 *     via `cn` (so custom classNames are appended, not swapped in), and
 *   - for `AlertDialogAction`/`AlertDialogCancel`, rendering Radix's
 *     `Action`/`Cancel` with `asChild` around this codebase's `Button`
 *     component (Cancel forced to `variant="outline"`, both forced to
 *     `size="lg"`), rather than a bare `<button>`.
 *
 * These tests only exercise this wrapper's own contribution -- open/close
 * plumbing, className merging, data-slot markers, and the Button variant
 * wiring on Action/Cancel -- not Radix's internal focus-trap/animation
 * behavior. The component tree has no i18n, routing, or query-client
 * dependency of its own (confirmed by reading the source), so tests render
 * it directly with RTL's `render`/`screen` and no provider wrapper -- this
 * mirrors how AppShell.test.tsx exercises the same underlying Radix
 * AlertDialog (via `role="alertdialog"` and async `findByRole`, since the
 * dialog mounts through a Portal after the trigger is activated).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

function renderConfirmDialog(overrides?: { onConfirm?: () => void; contentClassName?: string }) {
  return render(
    <AlertDialog>
      <AlertDialogTrigger>Delete item</AlertDialogTrigger>
      <AlertDialogContent className={overrides?.contentClassName}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete item?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={overrides?.onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>,
  );
}

// AlertDialog/AlertDialogTrigger/AlertDialogContent together implement Radix's
// uncontrolled open/close flow: the primitive starts closed, and clicking the
// trigger renders Content (plus its Overlay, via a Portal) with
// role="alertdialog". This describes that plumbing still works through the
// wrapper's prop forwarding.
describe("AlertDialog open/close flow", () => {
  it("renders only the trigger until it is activated", () => {
    renderConfirmDialog();

    expect(screen.getByRole("button", { name: "Delete item" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("opens the dialog and renders its title, description and actions when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderConfirmDialog();

    await user.click(screen.getByRole("button", { name: "Delete item" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("closes the dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderConfirmDialog();

    await user.click(screen.getByRole("button", { name: "Delete item" }));
    await screen.findByRole("alertdialog");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

// AlertDialogAction renders Radix's Action primitive with `asChild`, so the
// caller's onClick (passed straight through via ...props) must still reach
// the rendered Button -- this is the wrapper's own prop-forwarding contract,
// not something Radix guarantees on its own.
describe("AlertDialogAction click handling", () => {
  it("invokes the onClick handler passed to AlertDialogAction when the action button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderConfirmDialog({ onConfirm });

    await user.click(screen.getByRole("button", { name: "Delete item" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

// Every styled subcomponent merges its default Tailwind classes with a
// caller-supplied `className` via `cn(...)` (append, not replace) and stamps
// a `data-slot` marker identifying which part of the dialog it is. These are
// the wrapper's only real styling contribution over the bare Radix
// primitives, so we assert both the merge behavior and the markers.
describe("AlertDialog className merging and data-slot markers", () => {
  it("merges a custom className onto AlertDialogContent alongside its default classes", async () => {
    const user = userEvent.setup();
    renderConfirmDialog({ contentClassName: "custom-content-class" });

    await user.click(screen.getByRole("button", { name: "Delete item" }));
    const dialog = await screen.findByRole("alertdialog");

    expect(dialog).toHaveClass("custom-content-class");
    // Default classes must still be present -- proves cn() appends rather
    // than overwrites the built-in styling.
    expect(dialog).toHaveClass("fixed", "top-[50%]", "left-[50%]");
    expect(dialog).toHaveAttribute("data-slot", "alert-dialog-content");
  });

  it("stamps data-slot markers on the trigger, header, footer, title and description", async () => {
    const user = userEvent.setup();
    renderConfirmDialog();

    expect(screen.getByRole("button", { name: "Delete item" })).toHaveAttribute(
      "data-slot",
      "alert-dialog-trigger",
    );

    await user.click(screen.getByRole("button", { name: "Delete item" }));
    await screen.findByRole("alertdialog");

    expect(screen.getByText("Delete item?")).toHaveAttribute("data-slot", "alert-dialog-title");
    expect(screen.getByText("This action cannot be undone.")).toHaveAttribute(
      "data-slot",
      "alert-dialog-description",
    );
    expect(screen.getByText("Delete item?").closest('[data-slot="alert-dialog-header"]')).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Cancel" }).closest('[data-slot="alert-dialog-footer"]'),
    ).not.toBeNull();
  });

  it("renders the overlay with its default classes plus a custom className, as a direct standalone usage", () => {
    // AlertDialogOverlay is normally rendered implicitly inside
    // AlertDialogContent, but it is exported standalone too, so exercise the
    // wrapper's own className-merging contribution on it directly. It still
    // needs an AlertDialog root for Radix's internal context (open state),
    // so it is rendered `open` with no trigger/content sibling.
    const { container } = render(
      <AlertDialog open>
        <AlertDialogOverlay className="custom-overlay-class" />
      </AlertDialog>,
    );

    const overlay = container.querySelector('[data-slot="alert-dialog-overlay"]');
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass("custom-overlay-class", "fixed", "inset-0");
  });
});

// AlertDialogAction and AlertDialogCancel are the wrapper's most significant
// deviation from stock shadcn/Radix: instead of a bare styled <button>, each
// wraps this codebase's `Button` via `asChild`, forcing `size="lg"` and (for
// Cancel only) `variant="outline"`. Button stamps its own resolved
// variant/size onto `data-variant`/`data-size`, so we can assert this wiring
// without reaching into Button's internals.
describe("AlertDialogAction and AlertDialogCancel Button variant wiring", () => {
  it("renders Cancel as an outline, lg-sized Button and Action as a default, lg-sized Button", async () => {
    const user = userEvent.setup();
    renderConfirmDialog();

    await user.click(screen.getByRole("button", { name: "Delete item" }));
    await screen.findByRole("alertdialog");

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    expect(cancelButton).toHaveAttribute("data-variant", "outline");
    expect(cancelButton).toHaveAttribute("data-size", "lg");
    expect(cancelButton).toHaveAttribute("data-slot", "alert-dialog-cancel");

    // AlertDialogAction does not set a variant prop, so Button falls back to
    // its own "default" (filled) variant -- only size is forced to "lg".
    expect(confirmButton).toHaveAttribute("data-variant", "default");
    expect(confirmButton).toHaveAttribute("data-size", "lg");
    expect(confirmButton).toHaveAttribute("data-slot", "alert-dialog-action");
  });

  it("merges a custom className onto AlertDialogAction/Cancel alongside Button's variant classes", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Delete item</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogFooter>
            <AlertDialogCancel className="custom-cancel-class">Cancel</AlertDialogCancel>
            <AlertDialogAction className="custom-action-class">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    await user.click(screen.getByRole("button", { name: "Delete item" }));
    await screen.findByRole("alertdialog");

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass(
      "custom-cancel-class",
      "border-brand-primary",
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass(
      "custom-action-class",
      "bg-brand-primary",
    );
  });
});
