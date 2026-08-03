/**
 * Unit tests for Badge / badgeVariants (src/ui/components/ui/badge.tsx).
 *
 * Badge is a stock shadcn wrapper around a `cva` class map: it renders a
 * `<span>` (or, via `asChild`, whatever child element is passed to Radix's
 * `Slot.Root`) with `data-slot="badge"`, `data-variant={variant}`, and a
 * `className` built from `badgeVariants({ variant })` merged with any
 * caller-supplied `className` via `cn` (clsx + tailwind-merge). It holds no
 * internal state, touches no context/provider, does no i18n, and does no
 * routing -- so these tests render it directly with RTL's `render`/`screen`,
 * with no provider wrapper and no mocking of any kind (matching the
 * SplitButton test's approach for similarly "pure" presentational
 * components in this directory).
 *
 * Behaviors/branches covered:
 *  - Renders children content inside the badge element.
 *  - Default variant ("default") applies bg-primary/text-primary-foreground
 *    classes and sets data-variant="default" when `variant` is omitted.
 *  - Each of the seven `variant` branches in `badgeVariants` (default,
 *    secondary, destructive, outline, ghost, link, success) maps to its own
 *    distinct set of variant-specific classes and stamps the matching
 *    data-variant attribute.
 *  - Caller-supplied `className` is merged with (not replacing) the variant
 *    classes, and tailwind-merge's conflict resolution is honored (a
 *    conflicting utility in `className` wins over the variant default).
 *  - Arbitrary extra props (e.g. `onClick`, `aria-label`, `id`) spread onto
 *    the rendered element, since Badge forwards `...props`.
 *  - `asChild` swaps the rendered element from `<span>` to Radix's
 *    `Slot.Root`, which merges Badge's props onto the single child element
 *    instead of wrapping it (so an `<a>` child renders as an `<a>`, not a
 *    `<span><a>...</a></span>`), still carrying data-slot/data-variant and
 *    the variant classes.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Badge, badgeVariants } from "./badge";

describe("Badge rendering", () => {
  it("renders its children inside the badge element", () => {
    render(<Badge>New</Badge>);

    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders as a span with data-slot='badge' and defaults to the 'default' variant", () => {
    render(<Badge>New</Badge>);

    const badge = screen.getByText("New");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveAttribute("data-slot", "badge");
    expect(badge).toHaveAttribute("data-variant", "default");
    expect(badge).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("spreads arbitrary extra props (event handlers, aria attributes) onto the element", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Badge onClick={onClick} aria-label="status badge" id="my-badge">
        New
      </Badge>,
    );

    const badge = screen.getByText("New");
    expect(badge).toHaveAttribute("aria-label", "status badge");
    expect(badge).toHaveAttribute("id", "my-badge");

    await user.click(badge);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// badgeVariants is a cva() class map keyed by `variant`. Each branch supplies
// a visually distinct set of Tailwind classes (color/background/hover), and
// the Badge component also mirrors the chosen variant onto data-variant for
// styling/testing hooks. This table exercises every branch defined in the
// source so a future edit that drops or renames a variant's classes fails
// a test instead of silently shipping.
describe("Badge variant class mapping", () => {
  const cases: Array<{
    variant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | "success";
    expectedClasses: string[];
  }> = [
    { variant: "default", expectedClasses: ["bg-primary", "text-primary-foreground"] },
    { variant: "secondary", expectedClasses: ["bg-secondary", "text-secondary-foreground"] },
    { variant: "destructive", expectedClasses: ["bg-destructive", "text-white"] },
    { variant: "outline", expectedClasses: ["border-border", "text-foreground"] },
    { variant: "ghost", expectedClasses: [] }, // ghost has no base bg/text class, only hover classes
    { variant: "link", expectedClasses: ["text-primary", "underline-offset-4"] },
    { variant: "success", expectedClasses: ["bg-chip-success", "text-chip-success-foreground"] },
  ];

  it.each(cases)(
    "applies the $variant variant's classes and data-variant attribute",
    ({ variant, expectedClasses }) => {
      render(<Badge variant={variant}>Label</Badge>);

      const badge = screen.getByText("Label");
      expect(badge).toHaveAttribute("data-variant", variant);
      if (expectedClasses.length > 0) {
        expect(badge).toHaveClass(...expectedClasses);
      }
    },
  );

  it("does not apply another variant's distinguishing classes for a given variant", () => {
    render(<Badge variant="secondary">Label</Badge>);

    const badge = screen.getByText("Label");
    expect(badge).not.toHaveClass("bg-primary");
    expect(badge).not.toHaveClass("bg-destructive");
  });
});

// Badge builds its className via `cn(badgeVariants({ variant }), className)`,
// i.e. clsx + tailwind-merge. This means a caller-supplied className is
// appended (composable with the variant classes) but, per tailwind-merge's
// rules, a conflicting utility from the same class group in `className`
// overrides the variant's default rather than both classes coexisting.
describe("Badge className merging", () => {
  it("merges a non-conflicting custom className alongside the variant classes", () => {
    render(<Badge className="my-custom-class">Label</Badge>);

    const badge = screen.getByText("Label");
    expect(badge).toHaveClass("my-custom-class");
    expect(badge).toHaveClass("bg-primary"); // default variant class still present
  });

  it("lets a conflicting utility class in className win over the variant default (tailwind-merge)", () => {
    render(<Badge className="bg-red-500">Label</Badge>);

    const badge = screen.getByText("Label");
    expect(badge).toHaveClass("bg-red-500");
    expect(badge).not.toHaveClass("bg-primary");
  });
});

// asChild swaps the underlying element from a plain <span> to Radix's
// Slot.Root, which clones its single child and merges Badge's props
// (data-slot, data-variant, className, ...rest) onto that child element
// instead of rendering an extra wrapper node. This lets a Badge be
// composed onto e.g. an <a> so the anchor itself carries the badge styling.
describe("Badge asChild behavior", () => {
  it("renders the child element directly (no wrapping span) and merges badge props onto it", () => {
    render(
      <Badge asChild variant="secondary">
        <a href="/status">Active</a>
      </Badge>,
    );

    const link = screen.getByRole("link", { name: "Active" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/status");
    expect(link).toHaveAttribute("data-slot", "badge");
    expect(link).toHaveAttribute("data-variant", "secondary");
    expect(link).toHaveClass("bg-secondary", "text-secondary-foreground");
    // No separate <span> wrapper should exist around the anchor.
    expect(link.parentElement?.tagName).not.toBe("SPAN");
  });

  it("renders a plain span (not a Slot) when asChild is omitted/false", () => {
    render(<Badge asChild={false}>Plain</Badge>);

    const badge = screen.getByText("Plain");
    expect(badge.tagName).toBe("SPAN");
  });
});

// badgeVariants is also exported directly as the raw cva() function, e.g.
// for callers that need the class string without rendering a Badge (such
// as composing badge-like styling onto another component).
describe("badgeVariants direct usage", () => {
  it("returns the default variant's classes when called with no arguments", () => {
    const classes = badgeVariants();

    expect(classes).toContain("bg-primary");
    expect(classes).toContain("text-primary-foreground");
  });

  it("returns the requested variant's classes when called with a variant", () => {
    const classes = badgeVariants({ variant: "outline" });

    expect(classes).toContain("border-border");
    expect(classes).not.toContain("bg-primary");
  });
});
