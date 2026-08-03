/**
 * Unit tests for Skeleton (src/ui/components/ui/skeleton.tsx).
 *
 * Skeleton is a stock shadcn loading-placeholder wrapper: it renders a plain
 * `<div>` with `data-slot="skeleton"` and a className built from
 * `cn("animate-pulse rounded-md bg-accent", className)` (clsx + tailwind-merge),
 * forwarding any other `...props` (children, event handlers, aria attributes,
 * style, etc.) straight onto the div. It holds no internal state, touches no
 * context/provider, does no i18n, and does no routing -- so these tests
 * render it directly with RTL's `render`/`screen`, with no provider wrapper
 * and no mocking of any kind (matching the Badge/SplitButton tests' approach
 * for similarly "pure" presentational components in this directory).
 *
 * Behaviors verified:
 *  - Renders a div with data-slot="skeleton" and the base
 *    animate-pulse/rounded-md/bg-accent classes applied by default.
 *  - Caller-supplied className is merged with (not replacing) the base
 *    classes, and tailwind-merge's conflict resolution is honored (a
 *    conflicting utility in className wins over the base default, e.g. a
 *    custom bg-* overrides bg-accent).
 *  - Arbitrary extra props (children, aria attributes, event handlers, data-*
 *    attributes) spread onto the rendered element, since Skeleton forwards
 *    ...props.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Skeleton } from "./skeleton";

// Skeleton's core job: always render a div carrying data-slot="skeleton" and
// the fixed pulse-animation/shape/background classes so any consumer gets a
// consistent loading placeholder look without having to pass className.
describe("Skeleton rendering", () => {
  it("renders a div with data-slot='skeleton' and the base pulse/shape/background classes", () => {
    render(<Skeleton data-testid="skeleton" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton.tagName).toBe("DIV");
    expect(skeleton).toHaveAttribute("data-slot", "skeleton");
    expect(skeleton).toHaveClass("animate-pulse", "rounded-md", "bg-accent");
  });

  it("spreads arbitrary extra props (children, aria attributes, event handlers) onto the element", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Skeleton data-testid="skeleton" aria-label="loading" onClick={onClick}>
        <span>placeholder content</span>
      </Skeleton>,
    );

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("aria-label", "loading");
    expect(screen.getByText("placeholder content")).toBeInTheDocument();

    await user.click(skeleton);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// Skeleton builds its className via `cn("animate-pulse rounded-md bg-accent",
// className)`, i.e. clsx + tailwind-merge. A caller-supplied className is
// appended (composable with the base classes) but, per tailwind-merge's
// rules, a conflicting utility from the same class group in `className`
// overrides the base default rather than both classes coexisting -- this is
// how callers resize/reshape a Skeleton (e.g. h-4 w-full for a text line).
describe("Skeleton className merging", () => {
  it("merges a non-conflicting custom className alongside the base classes", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-full" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("h-4", "w-full");
    expect(skeleton).toHaveClass("animate-pulse", "rounded-md", "bg-accent");
  });

  it("lets a conflicting utility class in className win over the base default (tailwind-merge)", () => {
    // bg-destructive conflicts with the base bg-accent (same tailwind-merge
    // class group), so tailwind-merge must drop bg-accent and keep only the
    // caller's override -- verifying cn() is actually doing conflict
    // resolution rather than naive string concatenation.
    render(<Skeleton data-testid="skeleton" className="bg-destructive" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("bg-destructive");
    expect(skeleton).not.toHaveClass("bg-accent");
  });
});
