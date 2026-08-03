/**
 * Unit tests for the Toaster component (src/ui/components/ui/sonner.tsx).
 *
 * The file wraps the third-party `sonner` package's `Toaster` with a fixed
 * set of props: `theme="light"`, `richColors`, `closeButton`,
 * `position="bottom-left"`, a `className="toaster group"`, a custom `icons`
 * map (one lucide icon per toast type), and a `style` object of CSS custom
 * properties (`--normal-bg`, `--normal-text`, `--normal-border`,
 * `--border-radius`) that read from the app's design-token variables. Any
 * caller-supplied prop is spread last, so it can override any of the above.
 * There is no branching logic in the component itself -- the only "behavior"
 * worth verifying is that these fixed props are actually wired through to
 * the real sonner runtime and observably affect what it renders.
 *
 * Testing approach / mocking strategy:
 *  - The real `sonner` package is used (not mocked), the same way
 *    src/App.test.tsx and src/ui/index.test.ts exercise it, because sonner's
 *    own internal state machine (mounting a toast, giving it the right
 *    `data-*` attributes) is exactly what proves our fixed props took
 *    effect. Mocking sonner away would leave nothing real to assert on.
 *  - Per this suite's established convention (see src/ui/index.test.ts and
 *    src/App.test.tsx), toasts are dispatched via the real `toast` function
 *    imported directly from `"sonner"` (not queried for by pre-existing DOM
 *    text, since sonner renders nothing until a toast actually exists --
 *    see the "container" describe block below) and observed via `findBy*`
 *    queries, which sonner's real (unmocked) animation/mount timers satisfy
 *    asynchronously.
 *  - No provider wrapper (renderWithProviders) is used: Toaster has no i18n,
 *    routing, or query-client dependency of its own.
 *  - Every test calls `toast.dismiss()` in an `afterEach` to drain sonner's
 *    module-level toast queue; sonner keeps its list of toasts in a
 *    singleton store outside of React, so a toast left over from one test
 *    would otherwise leak into the next test's render.
 */
import { render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { toast } from "sonner";
import { Toaster } from "./sonner";

afterEach(() => {
  toast.dismiss();
});

// Toaster (this file's sole export) always renders an outer landmark
// <section> -- sonner's ToasterInner builds its aria-label from the fixed
// "Notifications" label plus a hotkey string, regardless of whether any
// toast currently exists. This is the one piece of DOM this component
// contributes even before any toast is ever dispatched, so it's the
// smallest real assertion available for "the component mounts".
describe("Toaster (container landmark)", () => {
  it("renders the sonner landmark section with its default aria-label, even with no toasts queued", () => {
    render(<Toaster />);

    // sonner's default hotkey is ["altKey", "KeyT"], which its own hotkeyLabel
    // logic turns into the literal string "alt+T" appended to "Notifications".
    expect(screen.getByRole("region", { name: "Notifications alt+T" })).toBeInTheDocument();
  });

  // Precondition: no toast has been dispatched. Sonner's own toast-list <ol>
  // is conditionally rendered per position and is skipped entirely
  // ("if (!filteredToasts.length) return null") when there is nothing to
  // show, so the [data-sonner-toaster] node itself must be absent until a
  // toast exists.
  it("does not render the [data-sonner-toaster] list node before any toast is dispatched", () => {
    render(<Toaster />);

    expect(document.querySelector("[data-sonner-toaster]")).not.toBeInTheDocument();
  });
});

// Once at least one toast is dispatched (via the real `toast()` function),
// sonner mounts a [data-sonner-toaster] <ol> carrying data attributes that
// mirror the fixed props this wrapper passes: data-sonner-theme from
// theme="light" and data-y-position/data-x-position from
// position="bottom-left". The richColors prop instead surfaces on each
// individual [data-sonner-toast] item (as data-rich-colors), not on the
// list container itself.
describe("Toaster (fixed prop wiring)", () => {
  // Precondition: a toast is dispatched after Toaster is mounted, matching
  // how the app actually drives toasts (Toaster is mounted once at the
  // root; toast() is called later from anywhere in the tree).
  it("mounts a toast list tagged with the theme, richColors, and position props this wrapper hard-codes", async () => {
    render(<Toaster />);

    toast("Saved successfully");

    const toastEl = await screen.findByText("Saved successfully");
    const list = document.querySelector("[data-sonner-toaster]");
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute("data-sonner-theme", "light");
    // position="bottom-left" is destructured by sonner into y="bottom", x="left".
    expect(list).toHaveAttribute("data-y-position", "bottom");
    expect(list).toHaveAttribute("data-x-position", "left");
    expect(list).toHaveClass("toaster", "group");
    // richColors surfaces per-toast rather than on the list container.
    expect(toastEl.closest("[data-sonner-toast]")).toHaveAttribute("data-rich-colors", "true");
  });

  // Precondition: closeButton is a fixed prop on this wrapper. Sonner only
  // renders a [data-close-button] element per toast when that prop is true,
  // so its presence is direct evidence the prop was actually passed through
  // (rather than left at sonner's own default of `false`).
  it("renders a close button on toasts because closeButton is hard-coded to true", async () => {
    render(<Toaster />);

    toast("Dismissable toast");

    await screen.findByText("Dismissable toast");
    expect(document.querySelector("[data-close-button]")).toBeInTheDocument();
  });

  // Precondition: the wrapper supplies a custom `icons.success` (a lucide
  // CircleCheckIcon) instead of sonner's own built-in success icon. Firing a
  // toast.success(...) call is the only way to exercise the "success" branch
  // of sonner's icon-selection logic, so the toast's [data-icon] wrapper
  // must contain our custom <svg>, not sonner's default one.
  it("renders the custom success icon supplied via the icons prop for toast.success", async () => {
    render(<Toaster />);

    toast.success("Great success");

    const toastEl = await screen.findByText("Great success");
    const iconWrapper = toastEl.closest("[data-sonner-toast]")?.querySelector("[data-icon]");
    expect(iconWrapper).toBeInTheDocument();
    expect(iconWrapper?.querySelector("svg")).toBeInTheDocument();
  });

  // Precondition: a caller can spread additional/override props onto
  // <Toaster {...props} />, since the wrapper spreads `{...props}` last,
  // after all of its own hard-coded props. A caller-supplied `position`
  // must therefore win over the component's own default of "bottom-left".
  it("lets a caller-supplied prop override the component's own hard-coded default", async () => {
    render(<Toaster position="top-right" />);

    toast("Overridden position");

    await screen.findByText("Overridden position");
    const list = document.querySelector("[data-sonner-toaster]");
    expect(list).toHaveAttribute("data-y-position", "top");
    expect(list).toHaveAttribute("data-x-position", "right");
  });

  // Precondition: sonner mounts toasts asynchronously and removes them from
  // the DOM (after its own exit animation/timeout) once dismissed. This
  // confirms the Toaster instance stays functionally connected to the
  // module-level toast store across a dismiss, not just on initial mount.
  it("removes a toast from the DOM once it is dismissed", async () => {
    render(<Toaster />);

    const id = toast("Temporary toast");
    const toastText = await screen.findByText("Temporary toast");

    toast.dismiss(id);

    await waitForElementToBeRemoved(toastText);
  });
});
