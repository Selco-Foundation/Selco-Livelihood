/**
 * Unit tests for ScrollArea / ScrollBar (src/ui/components/ui/scroll-area.tsx).
 *
 * This module is a thin styling wrapper around Radix's real
 * `ScrollAreaPrimitive` (imported from the `radix-ui` umbrella package, i.e.
 * `@radix-ui/react-scroll-area` under the hood) -- no custom state or logic
 * of its own beyond wiring up `data-slot` markers and merging Tailwind
 * classes via `cn`:
 *
 *  - `ScrollArea` renders `Root > (Viewport > children, ScrollBar, Corner)`.
 *    It forwards every prop it doesn't destructure (`className`, `children`)
 *    straight onto Radix's `Root`, which means Radix options such as `type`
 *    and `dir` also pass through even though the wrapper's own signature
 *    doesn't list them explicitly.
 *  - `ScrollBar` renders Radix's `Scrollbar` (with a `Thumb` inside),
 *    defaulting `orientation` to `"vertical"` and switching its Tailwind
 *    classes between the vertical/horizontal variants based on that prop.
 *
 * Because all interactive behavior (auto-hiding, drag-to-scroll, hover
 * reveal) lives inside Radix's own state machine, these tests render the
 * real Radix primitives (no mocking) and drive that state machine through
 * real DOM events -- `pointerenter`/`pointerleave` on the scroll-area root,
 * with Vitest fake timers to fast-forward Radix's `scrollHideDelay` -- and
 * assert on the resulting DOM (`data-slot`, `data-state`, `data-orientation`,
 * class lists) rather than re-implementing Radix's logic. No i18n/router/
 * query-client provider is needed since the component touches none of them.
 *
 * A key, non-obvious runtime fact verified below: with Radix's default
 * `type="hover"` (what every real `<ScrollArea>` in this app gets, since
 * this wrapper never overrides `type`), Radix's `ScrollAreaScrollbarHover`
 * wraps an inner `ScrollAreaScrollbarAuto`, and *both* layers gate the
 * scrollbar's presence with their own `<Presence>` -- the outer one keyed
 * off pointer hover, the inner one keyed off a debounced resize-observer
 * check of whether the viewport's content actually overflows
 * (`offsetWidth < scrollWidth` / `offsetHeight < scrollHeight`). Because
 * jsdom never performs real layout, every size read is `0`, so the inner
 * "does it overflow" check is always false and that inner Presence never
 * renders its child -- meaning the scrollbar stays absent from the DOM
 * under `type="hover"` no matter how pointer enter/leave events are
 * simulated. This is a real, permanent jsdom limitation (not a source bug),
 * so the tests below assert the scrollbar's absence across pointer
 * enter/leave rather than asserting it appears -- the `type="always"`
 * cases in the `ScrollBar` block below cover the actual visible-scrollbar
 * DOM shape instead.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { ScrollArea, ScrollBar } from "./scroll-area";

const SCROLLBAR_SELECTOR = '[data-slot="scroll-area-scrollbar"]';
const VIEWPORT_SELECTOR = '[data-slot="scroll-area-viewport"]';

// ScrollArea is the outer Root: a `relative`-positioned container with
// data-slot="scroll-area" that always renders a Viewport (wrapping
// `children`) plus an internal vertical ScrollBar and Corner. It merges any
// caller `className` onto its base "relative" class via `cn`, and spreads
// all other props (e.g. `id`, `dir`, `data-testid`) straight onto Radix's
// Root element.
describe("ScrollArea", () => {
  it("renders its children inside the scroll viewport", () => {
    render(
      <ScrollArea data-testid="area">
        <div>Row content</div>
      </ScrollArea>,
    );

    const viewport = document.querySelector(VIEWPORT_SELECTOR);
    expect(viewport).toBeInTheDocument();
    // The children live inside the viewport element, not merely somewhere
    // in the document -- confirms ScrollArea threads `children` through to
    // Radix's Viewport rather than rendering them elsewhere (e.g. beside it).
    expect(viewport).toContainElement(screen.getByText("Row content"));
  });

  it("stamps data-slot=scroll-area on the root and data-slot=scroll-area-viewport on the viewport", () => {
    render(
      <ScrollArea data-testid="area">
        <div>content</div>
      </ScrollArea>,
    );

    expect(screen.getByTestId("area")).toHaveAttribute("data-slot", "scroll-area");
    expect(document.querySelector(VIEWPORT_SELECTOR)).toHaveAttribute(
      "data-slot",
      "scroll-area-viewport",
    );
  });

  it("merges a custom className onto the root's base 'relative' class instead of replacing it", () => {
    render(
      <ScrollArea data-testid="area" className="my-area h-40">
        <div>content</div>
      </ScrollArea>,
    );

    const area = screen.getByTestId("area");
    expect(area).toHaveClass("my-area", "h-40", "relative");
  });

  it("passes through arbitrary extra props (e.g. dir) since ScrollArea spreads ...props onto Radix's Root", () => {
    render(
      <ScrollArea data-testid="area" dir="rtl">
        <div>content</div>
      </ScrollArea>,
    );

    expect(screen.getByTestId("area")).toHaveAttribute("dir", "rtl");
  });

  // Radix's default `type` is "hover": the vertical ScrollBar this wrapper
  // always renders internally goes through `ScrollAreaScrollbarHover`, whose
  // outer Presence toggles `visible` true on pointer enter (and false again
  // `scrollHideDelay` after pointer leave). But that outer Presence only
  // controls whether an *inner* `ScrollAreaScrollbarAuto` is rendered, and
  // that inner component has its own Presence gated on real overflow
  // (viewport content size vs. viewport box size), which jsdom can never
  // report as true (see the file-level comment). So in this test
  // environment the scrollbar is permanently absent under type="hover",
  // regardless of pointer state -- these tests confirm that absence holds
  // steady across the pointer enter/leave/timer lifecycle rather than
  // asserting Radix's normal (real-browser) show/hide transition, which the
  // `type="always"` cases in the ScrollBar block below exercise instead.
  describe("scrollbar hover visibility (Radix's default type=\"hover\")", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not render the scrollbar before any pointer interaction", () => {
      render(
        <ScrollArea data-testid="area">
          <div>content</div>
        </ScrollArea>,
      );

      expect(document.querySelector(SCROLLBAR_SELECTOR)).not.toBeInTheDocument();
    });

    // Precondition being verified: even though Radix's outer hover-Presence
    // flips to `visible=true` on pointerenter (a real state change we can
    // observe indirectly), the scrollbar element still never reaches the DOM
    // because the inner overflow-gated Presence never opens in jsdom. A
    // consumer asserting the scrollbar appears on hover, without accounting
    // for this nesting, would be testing a DOM state jsdom cannot produce.
    it("still does not render the scrollbar once the pointer enters the scroll area", () => {
      render(
        <ScrollArea data-testid="area">
          <div>content</div>
        </ScrollArea>,
      );
      const area = screen.getByTestId("area");

      fireEvent.pointerEnter(area);
      expect(document.querySelector(SCROLLBAR_SELECTOR)).not.toBeInTheDocument();
    });

    it("remains absent through a pointer leave and after scrollHideDelay (600ms) elapses", () => {
      render(
        <ScrollArea data-testid="area">
          <div>content</div>
        </ScrollArea>,
      );
      const area = screen.getByTestId("area");

      fireEvent.pointerEnter(area);
      fireEvent.pointerLeave(area);

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(document.querySelector(SCROLLBAR_SELECTOR)).not.toBeInTheDocument();
    });
  });
});

// ScrollBar renders Radix's Scrollbar (containing a Thumb), with
// `orientation` defaulting to "vertical". Its class list branches on that
// prop: vertical gets a fixed width and left border, horizontal gets a
// fixed height, flex-col layout, and a top border instead. It requires a
// Radix ScrollArea context to render (it calls `useScrollAreaContext`), so
// it's rendered here nested inside a raw `ScrollAreaPrimitive.Root` rather
// than standalone. `type="always"` is used so the scrollbar renders
// unconditionally (bypassing the hover-based Presence covered above),
// keeping these orientation/class assertions independent of pointer state.
describe("ScrollBar", () => {
  it("defaults to vertical orientation with vertical-specific layout classes", () => {
    render(
      <ScrollAreaPrimitive.Root type="always">
        <ScrollAreaPrimitive.Viewport>content</ScrollAreaPrimitive.Viewport>
        <ScrollBar />
      </ScrollAreaPrimitive.Root>,
    );

    const scrollbar = document.querySelector(SCROLLBAR_SELECTOR);
    expect(scrollbar).toHaveAttribute("data-orientation", "vertical");
    expect(scrollbar).toHaveClass("h-full", "w-2.5", "border-l", "border-l-transparent");
    expect(scrollbar).not.toHaveClass("h-2.5", "flex-col");
  });

  it("switches to horizontal-specific layout classes when orientation='horizontal'", () => {
    render(
      <ScrollAreaPrimitive.Root type="always">
        <ScrollAreaPrimitive.Viewport>content</ScrollAreaPrimitive.Viewport>
        <ScrollBar orientation="horizontal" />
      </ScrollAreaPrimitive.Root>,
    );

    const scrollbar = document.querySelector(SCROLLBAR_SELECTOR);
    expect(scrollbar).toHaveAttribute("data-orientation", "horizontal");
    expect(scrollbar).toHaveClass("h-2.5", "flex-col", "border-t", "border-t-transparent");
    expect(scrollbar).not.toHaveClass("h-full", "w-2.5");
  });

  it("stamps data-slot=scroll-area-scrollbar and merges a custom className with its base classes", () => {
    render(
      <ScrollAreaPrimitive.Root type="always">
        <ScrollAreaPrimitive.Viewport>content</ScrollAreaPrimitive.Viewport>
        <ScrollBar className="my-scrollbar" />
      </ScrollAreaPrimitive.Root>,
    );

    const scrollbar = document.querySelector(SCROLLBAR_SELECTOR);
    expect(scrollbar).toHaveAttribute("data-slot", "scroll-area-scrollbar");
    expect(scrollbar).toHaveClass("my-scrollbar", "flex", "touch-none");
  });

  // The Thumb inside ScrollBar is itself wrapped in a Presence keyed off
  // Radix's computed `hasThumb` (derived from viewport/content sizes -- see
  // `getThumbRatio` in @radix-ui/react-scroll-area). jsdom never lays out
  // real content, so `offsetWidth`/`scrollWidth`/`offsetHeight`/
  // `scrollHeight` all report 0, `hasThumb` is always false, and the Thumb
  // never mounts -- even under `type="always"`, which only forces the
  // *scrollbar track* (not its thumb) to be present. This is a real,
  // permanent jsdom limitation for this component, not a bug in the source.
  it("never mounts the thumb in jsdom, since content/viewport sizes are always reported as zero", () => {
    render(
      <ScrollAreaPrimitive.Root type="always">
        <ScrollAreaPrimitive.Viewport>content</ScrollAreaPrimitive.Viewport>
        <ScrollBar />
      </ScrollAreaPrimitive.Root>,
    );

    expect(document.querySelector('[data-slot="scroll-area-thumb"]')).not.toBeInTheDocument();
  });
});
