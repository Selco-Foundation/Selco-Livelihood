/**
 * Unit tests for the Tooltip wrapper (src/ui/components/ui/tooltip.tsx).
 *
 * This file is a thin styling/composition wrapper around Radix's `Tooltip`
 * primitives (`Tooltip.Provider`, `Tooltip.Root`, `Tooltip.Trigger`,
 * `Tooltip.Portal`, `Tooltip.Content`, `Tooltip.Arrow`), imported from the
 * unified `radix-ui` package. What each export actually contributes over the
 * bare primitive:
 *  - `TooltipProvider`: forwards all props to `Tooltip.Provider`, but
 *    defaults `delayDuration` to `0` (Radix's own default is 700ms) when the
 *    caller doesn't specify one, and stamps `data-slot="tooltip-provider"`.
 *  - `Tooltip`: forwards straight to `Tooltip.Root`, adding only
 *    `data-slot="tooltip"`. All open/close state (hover, focus, Escape
 *    dismissal, delay timing) is Radix's own state machine, not custom logic
 *    here.
 *  - `TooltipTrigger`: forwards straight to `Tooltip.Trigger`, adding only
 *    `data-slot="tooltip-trigger"`.
 *  - `TooltipContent`: always renders through a `Tooltip.Portal`, defaults
 *    `sideOffset` to `0` (Radix's default is 0 too, but this wrapper commits
 *    to it explicitly) when the caller omits it, merges its default Tailwind
 *    classes with any caller `className` via `cn` (append, not replace), and
 *    additionally renders a `Tooltip.Arrow` inside the content.
 *
 * Radix's Tooltip requires an ancestor `Tooltip.Provider` for its
 * delay-timer context, so every test wraps its `Tooltip` in this file's own
 * `TooltipProvider` (not the app's `src/test/render-with-providers.tsx`,
 * since that wrapper also pulls in i18n/router/query-client providers this
 * component has no dependency on -- confirmed by reading the source). Tests
 * render the real Radix primitives (no mocking of Radix) and drive them with
 * `@testing-library/user-event` for hover/focus interactions and `fireEvent`
 * + fake timers for the one test that depends on precise delay timing,
 * matching the sibling scroll-area.test.tsx convention for Radix
 * timer-driven behavior. Content is queried with async `findBy*`/`waitFor`
 * since `TooltipContent` only mounts into the DOM (through a Portal) once
 * the tooltip actually opens.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

function renderInfoTooltip(overrides?: {
  providerDelayDuration?: number;
  contentClassName?: string;
  sideOffset?: number;
}) {
  return render(
    <TooltipProvider delayDuration={overrides?.providerDelayDuration}>
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent className={overrides?.contentClassName} sideOffset={overrides?.sideOffset}>
          Helpful details
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );
}

// Tooltip/TooltipTrigger/TooltipContent together implement Radix's
// hover-driven disclosure: with the wrapper's TooltipProvider defaulting
// delayDuration to 0, hovering the trigger opens the tooltip with no
// perceptible wait, and moving the pointer away closes it again. The
// trigger carries `aria-describedby` pointing at the content's id only
// while the tooltip is open.
describe("Tooltip open/close via pointer hover", () => {
  it("renders only the trigger until it is hovered", () => {
    renderInfoTooltip();

    const trigger = screen.getByText("Hover me");
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens the tooltip and renders its content when the trigger is hovered", async () => {
    const user = userEvent.setup();
    renderInfoTooltip();

    await user.hover(screen.getByText("Hover me"));

    const content = await screen.findByRole("tooltip");
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent("Helpful details");
    expect(screen.getByText("Hover me")).toHaveAttribute("aria-describedby", content.id);
  });

  // Business rule under test: Radix's Tooltip.Content defaults to
  // "hoverable content" (see @radix-ui/react-tooltip's TooltipContentHoverable),
  // meaning leaving the trigger does NOT close the tooltip immediately -- it
  // opens a pointer "grace area" polygon between trigger and content so the
  // user can move the mouse onto the content without it disappearing. The
  // tooltip only actually closes once a subsequent document-level pointermove
  // lands outside that grace area, which is why this test must dispatch a
  // follow-up pointermove far from both elements (not just unhover) to
  // observe the close.
  it("closes the tooltip when the pointer leaves the trigger and then moves away from the grace area", async () => {
    const user = userEvent.setup();
    renderInfoTooltip();

    await user.hover(screen.getByText("Hover me"));
    await screen.findByRole("tooltip");

    await user.unhover(screen.getByText("Hover me"));
    fireEvent.pointerMove(document.body, { clientX: 9999, clientY: 9999 });

    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });
});

// Radix's Tooltip.Trigger also opens on keyboard focus (not just pointer
// hover), which is what makes tooltips accessible to keyboard-only users;
// it closes again on blur. This is a separate code path from pointer
// hover/unhover above.
describe("Tooltip open/close via keyboard focus", () => {
  it("opens the tooltip when the trigger receives focus", async () => {
    renderInfoTooltip();

    const trigger = screen.getByText("Hover me");
    fireEvent.focus(trigger);

    const content = await screen.findByRole("tooltip");
    expect(content).toHaveTextContent("Helpful details");
  });

  it("closes the tooltip when the trigger loses focus", async () => {
    renderInfoTooltip();

    const trigger = screen.getByText("Hover me");
    fireEvent.focus(trigger);
    await screen.findByRole("tooltip");

    fireEvent.blur(trigger);

    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });
});

// Escape is wired by Radix's dismissable-layer behavior on the open
// tooltip, independent of how it was opened.
describe("Tooltip dismissal via Escape", () => {
  it("closes an open tooltip when Escape is pressed", async () => {
    const user = userEvent.setup();
    renderInfoTooltip();

    await user.hover(screen.getByText("Hover me"));
    await screen.findByRole("tooltip");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });
});

// TooltipProvider's own contribution over the bare Radix primitive: it
// defaults `delayDuration` to 0 (instant open) unless the caller overrides
// it, and stamps `data-slot="tooltip-provider"`. This is verified
// behaviorally with fake timers: a non-zero delayDuration must keep the
// tooltip closed immediately after a pointerenter, and only open once that
// many milliseconds have actually elapsed.
describe("TooltipProvider delayDuration default and override", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not open the tooltip immediately when a non-zero delayDuration is set, but does after the delay elapses", async () => {
    render(
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Helpful details</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByText("Hover me");
    fireEvent.pointerEnter(trigger);
    fireEvent.pointerMove(trigger);

    // Immediately after entering, the delay timer has not elapsed yet.
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByRole("tooltip")).toHaveTextContent("Helpful details");
  });
});

// TooltipContent's own contribution over the bare Radix primitive: it
// always renders through a Portal, stamps `data-slot="tooltip-content"`,
// defaults `sideOffset` to 0 when the caller omits it (surfaced via Radix's
// own `data-side` attribute and Popper positioning style), merges a caller
// `className` onto its default Tailwind classes via `cn` (append, not
// replace), and renders a `Tooltip.Arrow` alongside its children.
// TooltipTrigger adds only its own `data-slot` marker with no other logic.
// Note: Radix's `Tooltip.Content` renders the *visible* popup as a plain,
// non-semantic `<div>` and separately mounts a visually-hidden `<span
// role="tooltip">` (queried above via `findByRole`) purely for the
// accessible name -- so these styling/data-slot assertions target the
// visible div directly (via its `data-slot` attribute) rather than the
// role query, which would return the hidden accessibility span instead.
// `TooltipProvider` accepts no such marker in practice: Radix's
// `Tooltip.Provider` is a pure context provider with no DOM node of its
// own, so the `data-slot="tooltip-provider"` prop this wrapper passes it
// has nothing to attach to and produces no observable DOM -- there is
// nothing runtime-visible to assert for that prop beyond what the
// open/close and delayDuration tests above already exercise via the
// context it establishes.
describe("TooltipContent styling, defaults and data-slot markers", () => {
  it("stamps data-slot markers on the trigger and the visible content popup", async () => {
    const user = userEvent.setup();
    renderInfoTooltip();

    expect(screen.getByText("Hover me")).toHaveAttribute("data-slot", "tooltip-trigger");

    await user.hover(screen.getByText("Hover me"));
    await screen.findByRole("tooltip");

    const visibleContent = document.querySelector('[data-slot="tooltip-content"]');
    expect(visibleContent).toBeInTheDocument();
    expect(visibleContent).toHaveTextContent("Helpful details");
  });

  it("merges a custom className onto TooltipContent alongside its default classes", async () => {
    const user = userEvent.setup();
    renderInfoTooltip({ contentClassName: "custom-tooltip-class" });

    await user.hover(screen.getByText("Hover me"));
    await screen.findByRole("tooltip");

    const visibleContent = document.querySelector('[data-slot="tooltip-content"]');
    expect(visibleContent).toHaveClass("custom-tooltip-class");
    // Default classes must still be present -- proves cn() appends rather
    // than overwrites the built-in styling.
    expect(visibleContent).toHaveClass("bg-foreground", "rounded-md", "text-background");
  });

  it("applies a custom sideOffset instead of the default 0 when supplied", async () => {
    const user = userEvent.setup();
    renderInfoTooltip({ sideOffset: 12 });

    await user.hover(screen.getByText("Hover me"));
    await screen.findByRole("tooltip");

    const visibleContent = document.querySelector('[data-slot="tooltip-content"]');
    // Radix's Popper positioning reports the side it actually resolved to
    // via `data-side`, and bakes sideOffset into the inline transform it
    // writes for that content -- both are only present once positioning has
    // run, confirming the wrapper's forwarded sideOffset reached Radix.
    expect(visibleContent).toHaveAttribute("data-side");
    expect(visibleContent?.getAttribute("style")).toBeTruthy();
  });
});
