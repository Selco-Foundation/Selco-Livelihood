/**
 * Unit tests for Separator (src/ui/components/ui/separator.tsx).
 *
 * Separator is a thin stock-shadcn wrapper around Radix's
 * `Separator.Root` (from the `radix-ui` umbrella package), which renders a
 * plain `<div>` (via `Primitive.div`). The wrapper itself only supplies
 * defaults (`orientation = "horizontal"`, `decorative = true`), stamps
 * `data-slot="separator"`, merges a fixed set of Tailwind utility classes
 * with any caller-supplied `className` via `cn` (clsx + tailwind-merge),
 * and forwards `...props`. All of the actual accessibility semantics come
 * from Radix's own `Separator` implementation, specifically:
 *  - `decorative` (default `true` here) toggles between `role="none"`
 *    (decorative -- hidden from the accessibility tree, no
 *    `aria-orientation`) and `role="separator"` with `aria-orientation`
 *    set only for the vertical orientation (per the ARIA spec, horizontal
 *    is the implicit default for `role="separator"` so it's omitted).
 *  - `orientation` drives the `data-orientation` DOM attribute (validated
 *    against `["horizontal", "vertical"]`, falling back to `"horizontal"`
 *    for any other value) -- this attribute is what the component's static
 *    `data-[orientation=...]:` Tailwind classes key off of; the class
 *    *string* itself never changes with orientation, only which of its
 *    data-attribute-scoped utilities apply at render/paint time.
 *
 * Separator holds no internal state, touches no context/provider, does no
 * i18n, and does no routing, so these tests render it directly with RTL's
 * `render`/`screen` -- no provider wrapper and no mocking of any kind
 * (matching the Badge/Label tests' approach for similarly "pure"
 * presentational wrapper components in this directory).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Separator } from "./separator";

// Default rendering: no props supplied at all. The component's own default
// parameters (`orientation = "horizontal"`, `decorative = true`) apply, so
// per Radix's semantics this should be a <div> hidden from the a11y tree
// (role="none") and stamped with the horizontal data-orientation and the
// wrapper's data-slot/class hooks.
describe("Separator default rendering", () => {
  it("renders a div with data-slot='separator' and data-orientation='horizontal'", () => {
    render(<Separator data-testid="sep" />);

    const separator = screen.getByTestId("sep");
    expect(separator.tagName).toBe("DIV");
    expect(separator).toHaveAttribute("data-slot", "separator");
    expect(separator).toHaveAttribute("data-orientation", "horizontal");
  });

  it("applies the base layout classes (shrink-0, bg-border, and both orientation-scoped size utilities)", () => {
    render(<Separator data-testid="sep" />);

    const separator = screen.getByTestId("sep");
    // These data-[orientation=...] classes are static strings baked into
    // the className regardless of the actual orientation value -- the
    // browser resolves which one is "active" via the data-orientation
    // attribute at CSS-match time, not via conditional class inclusion.
    expect(separator).toHaveClass(
      "shrink-0",
      "bg-border",
      "data-[orientation=horizontal]:h-px",
      "data-[orientation=horizontal]:w-full",
      "data-[orientation=vertical]:h-full",
      "data-[orientation=vertical]:w-px",
    );
  });

  it("defaults to decorative (role='none', not exposed as an accessible separator)", () => {
    render(<Separator data-testid="sep" />);

    // decorative=true (the wrapper's default) maps to role="none" in Radix's
    // Separator, so it must NOT be reachable via the "separator" ARIA role.
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(screen.getByTestId("sep")).toHaveAttribute("role", "none");
  });
});

// Radix's Separator only sets role="separator" (making it a real,
// accessible separator landmark) when `decorative` is explicitly false.
// aria-orientation is set for the vertical case only, since horizontal is
// the ARIA-spec-implicit default for role="separator" and is intentionally
// omitted rather than set to "horizontal".
describe("Separator non-decorative (accessible) mode", () => {
  it("exposes role='separator' and omits aria-orientation for the (default) horizontal orientation", () => {
    render(<Separator decorative={false} />);

    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("data-orientation", "horizontal");
    expect(separator).not.toHaveAttribute("aria-orientation");
  });

  it("exposes role='separator' with aria-orientation='vertical' when orientation is vertical", () => {
    render(<Separator decorative={false} orientation="vertical" />);

    const separator = screen.getByRole("separator", { orientation: "vertical" });
    expect(separator).toHaveAttribute("data-orientation", "vertical");
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
  });
});

// The `orientation` prop is reflected verbatim (when valid) onto
// data-orientation, which is what the component's CSS variants key off of.
describe("Separator orientation prop", () => {
  it("sets data-orientation='vertical' when orientation='vertical' is passed explicitly", () => {
    render(<Separator orientation="vertical" data-testid="sep" />);

    expect(screen.getByTestId("sep")).toHaveAttribute("data-orientation", "vertical");
  });

  // Radix's Separator validates `orientation` against ["horizontal",
  // "vertical"] and silently falls back to "horizontal" for anything else.
  // Since our wrapper's default parameter only fires when the prop is
  // *omitted* (not when it's present-but-invalid), an invalid value passed
  // straight through the wrapper still reaches Radix's own fallback --
  // this exercises that underlying safety net via the public wrapper API.
  it("falls back to data-orientation='horizontal' for an invalid orientation value", () => {
    render(
      <Separator
        orientation={"diagonal" as unknown as "horizontal" | "vertical"}
        data-testid="sep"
      />,
    );

    expect(screen.getByTestId("sep")).toHaveAttribute("data-orientation", "horizontal");
  });
});

// Separator builds its className via `cn(<default classes>, className)`,
// i.e. clsx + tailwind-merge. A caller-supplied className should be
// appended alongside the defaults, and per tailwind-merge's conflict
// resolution, a conflicting utility from the same class group in
// `className` should override the built-in default rather than both
// classes coexisting.
describe("Separator className merging", () => {
  it("merges a non-conflicting custom className alongside the default classes", () => {
    render(<Separator className="my-custom-class" data-testid="sep" />);

    const separator = screen.getByTestId("sep");
    expect(separator).toHaveClass("my-custom-class");
    expect(separator).toHaveClass("shrink-0", "bg-border"); // defaults still present
  });

  it("lets a conflicting utility class in className win over the default (tailwind-merge)", () => {
    render(<Separator className="bg-red-500" data-testid="sep" />);

    const separator = screen.getByTestId("sep");
    expect(separator).toHaveClass("bg-red-500");
    expect(separator).not.toHaveClass("bg-border");
  });
});

// Separator spreads `...props` onto Separator.Root, so any extra DOM
// attributes (id, aria-*, data-*, etc.) passed by a caller should land on
// the rendered element unchanged.
describe("Separator prop forwarding", () => {
  it("spreads arbitrary extra props (id, aria-label) onto the element", () => {
    render(<Separator id="section-divider" aria-label="section divider" data-testid="sep" />);

    const separator = screen.getByTestId("sep");
    expect(separator).toHaveAttribute("id", "section-divider");
    expect(separator).toHaveAttribute("aria-label", "section divider");
  });
});
