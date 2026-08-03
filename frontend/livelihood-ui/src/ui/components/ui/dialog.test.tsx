/**
 * Unit tests for the shadcn/Radix Dialog wrapper (src/ui/components/ui/dialog.tsx).
 *
 * This file re-exports Radix's `Dialog` primitives (Root, Trigger, Portal,
 * Close, Overlay, Content, Title, Description) as `Dialog`/`DialogTrigger`/
 * `DialogPortal`/`DialogClose`/`DialogOverlay`/`DialogTitle`/`DialogDescription`,
 * each stamped with a `data-slot` attribute and Tailwind classes merged via
 * `cn` (clsx + tailwind-merge). `DialogContent` is the one composite piece:
 * it always wraps its children in `DialogPortal` + `DialogOverlay` and
 * conditionally renders a built-in "X" close button controlled by its
 * `showCloseButton` prop (default true). `DialogHeader`/`DialogFooter` are
 * plain styled `<div>`s with no Radix primitive underneath; `DialogFooter`
 * additionally has its own `showCloseButton` prop (default false) that, when
 * true, renders a `Button` wrapped in `DialogPrimitive.Close asChild`.
 *
 * Because Radix's Dialog primitives supply all of the real interactive
 * behavior this file wires up (open/close state, portal rendering,
 * role="dialog"/aria-modal, Escape-to-close, outside-click-to-close, and
 * `DialogClose`'s click-to-close), these tests render the *real* `radix-ui`
 * components (nothing is mocked) and drive them with `@testing-library/user-event`
 * to verify the actual runtime behavior of this wrapper, not a hand-rolled
 * stub. No provider wrapper (router/query-client/i18n) is used: none of the
 * components in this file do routing, data fetching, or render translated
 * strings -- `renderWithProviders` would add nothing but noise here, matching
 * this directory's convention for "pure" wrapper components (see
 * badge.test.tsx / split-button.test.tsx).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

// Shared helper for the common case: an uncontrolled Dialog opened via its
// Trigger, with a Title + Description inside DialogContent (Radix expects a
// Title for accessibility, and supplying a Description avoids its "missing
// aria-describedby" dev warning).
function renderBasicDialog(contentProps: { showCloseButton?: boolean; className?: string } = {}) {
  return render(
    <Dialog>
      <DialogTrigger>Open dialog</DialogTrigger>
      <DialogContent {...contentProps}>
        <DialogTitle>Confirm action</DialogTitle>
        <DialogDescription>Are you sure you want to continue?</DialogDescription>
      </DialogContent>
    </Dialog>,
  );
}

// `Dialog` (DialogPrimitive.Root) + `DialogTrigger` together manage the
// open/closed state: DialogContent is not mounted at all until the trigger
// is activated, at which point Radix mounts it (via DialogPortal, appended to
// document.body) with role="dialog" and data-state="open", and wires its
// aria-labelledby/aria-describedby to the rendered DialogTitle/DialogDescription.
describe("Dialog open/close via trigger", () => {
  it("does not render dialog content until the trigger is clicked", () => {
    renderBasicDialog();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the dialog (role='dialog', data-state='open') when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderBasicDialog();

    await user.click(screen.getByText("Open dialog"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("data-state", "open");
    expect(screen.getByText("Confirm action")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to continue?")).toBeInTheDocument();
  });

  // DialogContent always wraps its children in DialogPortal, which (per Radix)
  // renders into document.body rather than in place -- so the dialog element
  // must NOT be a descendant of the component's own render container.
  it("renders the dialog content into a portal, outside the render container", async () => {
    const user = userEvent.setup();
    const { container } = renderBasicDialog();

    await user.click(screen.getByText("Open dialog"));
    const dialog = await screen.findByRole("dialog");

    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });
});

// DialogContent renders a built-in "X" close button (data-slot="dialog-close")
// whenever `showCloseButton` is true (the default). The button's only visible
// text is an sr-only "Close" span, which becomes its accessible name; clicking
// it goes through Radix's real DialogPrimitive.Close, which closes the dialog.
describe("DialogContent built-in close button (showCloseButton)", () => {
  it("renders a 'Close' button by default, and clicking it closes the dialog", async () => {
    const user = userEvent.setup();
    renderBasicDialog();
    await user.click(screen.getByText("Open dialog"));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("omits the close button when showCloseButton is false", async () => {
    const user = userEvent.setup();
    renderBasicDialog({ showCloseButton: false });
    await user.click(screen.getByText("Open dialog"));
    await screen.findByRole("dialog");

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });
});

// DialogContent's real behavior also includes Radix's two built-in dismissal
// paths, which this file gets "for free" by composing DialogPrimitive.Content
// inside DialogPortal/DialogOverlay: pressing Escape, and clicking outside the
// content (e.g. on the overlay).
describe("Dialog dismissal via Radix's built-in Escape/outside-click handling", () => {
  it("closes the dialog when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderBasicDialog();
    await user.click(screen.getByText("Open dialog"));
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes the dialog when the overlay (outside the content panel) is clicked", async () => {
    const user = userEvent.setup();
    renderBasicDialog();
    await user.click(screen.getByText("Open dialog"));
    await screen.findByRole("dialog");

    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();

    await user.click(overlay as Element);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

// `Dialog` is a thin pass-through to DialogPrimitive.Root, so it supports
// Radix's controlled mode: an explicit `open` prop makes the dialog's
// rendering track the caller's state instead of Radix's own internal state,
// and `onOpenChange` is invoked (with the requested next value) on every
// close attempt, but the dialog only actually closes once the caller updates
// `open` in response -- it does NOT close itself just because a close
// affordance was clicked.
describe("Dialog controlled open state (open / onOpenChange)", () => {
  it("renders the content immediately when `open` is true, without a trigger click", async () => {
    render(
      <Dialog open onOpenChange={vi.fn()}>
        <DialogContent>
          <DialogTitle>Server error</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("calls onOpenChange(false) on close-button click but keeps the dialog open until the caller updates `open`", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Server error</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Controlled: since the test harness never flips `open` to false in
    // response, Radix must not have closed the dialog on its own.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// A standalone `DialogClose` (not the built-in DialogContent close button)
// can be placed anywhere inside DialogContent, typically with `asChild` so it
// clones a caller-supplied element (e.g. a "Cancel" button) instead of
// rendering its own <button>. Clicking that element still goes through
// Radix's real Close behavior and closes the dialog.
describe("Standalone DialogClose (asChild)", () => {
  it("closes the dialog when a custom asChild DialogClose element is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Confirm</DialogTitle>
          <DialogClose asChild>
            <button type="button">Cancel</button>
          </DialogClose>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

// DialogFooter's own `showCloseButton` (default false) is independent of
// DialogContent's: when true, it renders a "Close" Button wrapped in
// `DialogPrimitive.Close asChild`, alongside whatever children were passed
// in. DialogContent's own close button is disabled in these tests so there
// is exactly one element with the accessible name "Close" to query against.
describe("DialogFooter's own close button (showCloseButton)", () => {
  it("does not render a footer close button by default, only its children", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Confirm</DialogTitle>
          <DialogFooter>
            <span>Custom footer content</span>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    await screen.findByRole("dialog");

    expect(screen.getByText("Custom footer content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("renders a working 'Close' button in the footer when showCloseButton is true", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Confirm</DialogTitle>
          <DialogFooter showCloseButton>
            <span>Custom footer content</span>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    await screen.findByRole("dialog");

    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(screen.getByText("Custom footer content")).toBeInTheDocument();

    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

// DialogHeader and DialogFooter are plain <div>s with no Radix primitive
// underneath (unlike every other export in this file), so they need no
// Dialog/open-state context at all and are rendered standalone here.
describe("DialogHeader and DialogFooter static styling", () => {
  it("DialogHeader stamps data-slot='dialog-header' and merges a custom className with its base layout classes", () => {
    render(<DialogHeader className="my-header">Header content</DialogHeader>);

    const header = screen.getByText("Header content");
    expect(header).toHaveAttribute("data-slot", "dialog-header");
    expect(header).toHaveClass("flex", "flex-col", "gap-2", "my-header");
  });

  it("DialogFooter stamps data-slot='dialog-footer' and merges a custom className with its base layout classes", () => {
    render(<DialogFooter className="my-footer">Footer content</DialogFooter>);

    const footer = screen.getByText("Footer content");
    expect(footer).toHaveAttribute("data-slot", "dialog-footer");
    expect(footer).toHaveClass("flex", "flex-col-reverse", "my-footer");
  });
});

// DialogContent, DialogTitle, DialogDescription and DialogOverlay each stamp
// their own data-slot and a fixed set of base Tailwind classes via `cn`, and
// accept a caller `className` that is merged in (with tailwind-merge
// resolving conflicts) rather than replacing the base classes outright.
describe("DialogContent/DialogTitle/DialogDescription/DialogOverlay styling and className merging", () => {
  it("stamps data-slot='dialog-content' on the content element and merges a custom className onto it", async () => {
    const user = userEvent.setup();
    renderBasicDialog({ className: "my-content" });
    await user.click(screen.getByText("Open dialog"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "dialog-content");
    expect(dialog).toHaveClass("my-content", "fixed", "top-[50%]", "gap-4");
  });

  it("stamps data-slot on DialogTitle/DialogDescription with their base typography classes", async () => {
    const user = userEvent.setup();
    renderBasicDialog();
    await user.click(screen.getByText("Open dialog"));
    await screen.findByRole("dialog");

    const title = screen.getByText("Confirm action");
    const description = screen.getByText("Are you sure you want to continue?");
    expect(title).toHaveAttribute("data-slot", "dialog-title");
    expect(title).toHaveClass("text-lg", "font-semibold");
    expect(description).toHaveAttribute("data-slot", "dialog-description");
    expect(description).toHaveClass("text-sm", "text-muted-foreground");
  });

  // Business rule under test: DialogTitle builds its className via
  // `cn("text-lg leading-none font-semibold", className)`, i.e. tailwind-merge
  // resolves same-group conflicts by letting the caller's class win, so a
  // conflicting text-size utility replaces (not just appends to) the default.
  it("lets a conflicting text-size utility in className override DialogTitle's default size (tailwind-merge)", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle className="text-2xl">Big title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open dialog"));
    await screen.findByRole("dialog");

    const title = screen.getByText("Big title");
    expect(title).toHaveClass("text-2xl");
    expect(title).not.toHaveClass("text-lg");
  });

  it("stamps data-slot='dialog-overlay' on the overlay element with its base classes while the dialog is open", async () => {
    const user = userEvent.setup();
    renderBasicDialog();
    await user.click(screen.getByText("Open dialog"));
    await screen.findByRole("dialog");

    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass("fixed", "inset-0", "bg-black/50");
  });
});
