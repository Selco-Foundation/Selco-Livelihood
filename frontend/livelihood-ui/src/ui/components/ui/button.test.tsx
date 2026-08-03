/**
 * Unit tests for Button (src/ui/components/ui/button.tsx).
 *
 * Button is a stock shadcn-style wrapper around a native `<button>` (or,
 * via Radix's `Slot.Root` when `asChild` is true, around whatever single
 * child element is passed to it). It has no internal state, no context
 * dependency, no i18n, and no routing, so these tests render it directly
 * with RTL's `render`/`screen` -- no provider wrapper and no mocking of
 * any kind. The only "mock" needed anywhere is a plain `vi.fn()` click
 * handler and a `React.createRef` to verify ref forwarding.
 *
 * Behaviors/branches covered:
 *  - Renders a native `<button>` by default, with `data-slot="button"` and
 *    the default variant/size reflected in `data-variant`/`data-size` and
 *    in representative Tailwind classes from `buttonVariants`.
 *  - `variant` prop selects the matching class branch from the `variants.variant`
 *    lookup table in `buttonVariants` (default/destructive/outline/secondary/
 *    ghost/link), asserted via distinguishing classes and the `data-variant`
 *    attribute mirror.
 *  - `size` prop selects the matching class branch from `variants.size`
 *    (default/xs/sm/lg/icon/icon-xs/icon-sm/icon-lg), asserted the same way.
 *  - `disabled` sets the native disabled attribute (which, combined with
 *    the `disabled:*` classes baked into `buttonVariants`, is how the
 *    component communicates disabled state -- there is no separate
 *    "disabled" branch in the component's own logic).
 *  - `asChild` swaps the rendered element from `Comp = "button"` to
 *    `Comp = Slot.Root`, which merges Button's props/classes onto its
 *    single child element instead of wrapping it in a `<button>` -- so
 *    passing an `<a>` child renders an anchor carrying the button classes,
 *    not a nested button-in-anchor.
 *  - `ref` forwarding and `onClick` both flow through via `{...props}`
 *    spread onto the underlying element (native DOM ref, since Button is
 *    a plain function component receiving `React.ComponentProps<"button">`).
 *  - `className` passed by the caller is merged (not replaced) via `cn(...)`
 *    with the variant/size classes from `buttonVariants`.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button, buttonVariants } from "./button";

// Button renders a plain native <button> by default (Comp = "button"),
// forwarding data-slot/data-variant/data-size plus the composed className
// from buttonVariants({variant, size, className}).
describe("Button default rendering", () => {
  it("renders a native button with default variant/size data attributes and classes", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button).toHaveAttribute("data-size", "default");
    // Default variant: brand-primary fill; default size: 44px height, 10px radius.
    expect(button).toHaveClass("bg-brand-primary", "text-neutral-25", "h-11", "rounded-[10px]");
  });

  it("merges a caller-supplied className with the variant/size classes instead of replacing them", () => {
    render(<Button className="my-custom-class">Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toHaveClass("my-custom-class");
    // Base variant classes must still be present alongside the custom one.
    expect(button).toHaveClass("bg-brand-primary");
  });
});

// variant selects one of six branches in buttonVariants' `variants.variant`
// table. Each branch supplies a distinct set of color/border classes; we
// assert one representative, distinguishing class per branch plus the
// data-variant mirror, rather than the full class string (design detail).
describe("Button variant class mapping", () => {
  it.each([
    ["default", "bg-brand-primary"],
    ["destructive", "bg-destructive"],
    ["outline", "border-brand-primary"],
    ["secondary", "bg-secondary"],
    ["ghost", "hover:bg-accent"],
    ["link", "text-brand-primary"],
  ] as const)("applies the %s variant's distinguishing class", (variant, expectedClass) => {
    render(<Button variant={variant}>Button</Button>);

    const button = screen.getByRole("button", { name: "Button" });
    expect(button).toHaveAttribute("data-variant", variant);
    expect(button).toHaveClass(expectedClass);
  });
});

// size selects one of eight branches in buttonVariants' `variants.size`
// table, driving height/width/radius/padding. Icon sizes use `size-*`
// (equal width/height) rather than `h-*`/`px-*`.
describe("Button size class mapping", () => {
  it.each([
    ["default", "h-11"],
    ["xs", "h-6"],
    ["sm", "h-8"],
    ["lg", "h-10"],
    ["icon", "size-9"],
    ["icon-xs", "size-6"],
    ["icon-sm", "size-8"],
    ["icon-lg", "size-10"],
  ] as const)("applies the %s size's distinguishing class", (size, expectedClass) => {
    render(<Button size={size}>Button</Button>);

    const button = screen.getByRole("button", { name: "Button" });
    expect(button).toHaveAttribute("data-size", size);
    expect(button).toHaveClass(expectedClass);
  });
});

// disabled is forwarded straight through to the native <button> element via
// the {...props} spread; buttonVariants' `disabled:*` classes are always
// present in the class string and only take visual effect once the native
// disabled attribute is set, which is also what prevents click handlers
// from firing (native browser/RTL behavior, not component-level logic).
describe("Button disabled state", () => {
  it("sets the native disabled attribute when disabled is true", () => {
    render(<Button disabled>Click me</Button>);

    expect(screen.getByRole("button", { name: "Click me" })).toBeDisabled();
  });

  it("prevents onClick from firing when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Click me
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Click me" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

// ref and onClick both flow through the {...props} spread onto the
// underlying native <button> element (Button does not use
// React.forwardRef explicitly, but a plain function component receiving
// a `ref` prop and spreading it works identically for this purpose here
// since React 19 passes `ref` as a normal prop to function components).
describe("Button ref forwarding and click handling", () => {
  it("forwards a ref to the underlying button DOM node", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Click me</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toHaveTextContent("Click me");
  });

  it("invokes the onClick handler when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    await user.click(screen.getByRole("button", { name: "Click me" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// asChild swaps `Comp` from the literal string "button" to Radix's
// `Slot.Root`, which clones Button's props (className, data-slot, etc.)
// onto its single child element rather than wrapping the child in an
// extra <button>. This is how Button supports rendering as e.g. an <a>
// while still carrying button styling -- precondition: exactly one valid
// React element child must be passed when asChild is true.
describe("Button asChild behavior", () => {
  it("renders the child element itself (e.g. an anchor) instead of a nested button when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/somewhere">Go</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Go" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/somewhere");
    // Button's classes/data-slot are merged onto the anchor, not a wrapper button.
    expect(link).toHaveAttribute("data-slot", "button");
    expect(link).toHaveClass("bg-brand-primary");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

// buttonVariants is exported separately so callers can compute Button's
// class string without rendering the component (e.g. to style a
// non-Button element consistently). Verify it produces the same classes
// for default and non-default variant/size combinations.
describe("buttonVariants class factory", () => {
  it("returns the default variant/size classes when called with no arguments", () => {
    const classes = buttonVariants();

    expect(classes).toContain("bg-brand-primary");
    expect(classes).toContain("h-11");
  });

  it("returns the requested variant/size classes and merges an extra className", () => {
    const classes = buttonVariants({ variant: "outline", size: "sm", className: "extra" });

    expect(classes).toContain("border-brand-primary");
    expect(classes).toContain("h-8");
    expect(classes).toContain("extra");
  });
});
