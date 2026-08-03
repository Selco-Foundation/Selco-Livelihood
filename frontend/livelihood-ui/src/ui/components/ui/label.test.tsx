/**
 * Unit tests for Label (src/ui/components/ui/label.tsx).
 *
 * Label is a thin stock-shadcn wrapper around Radix's `Label.Root`, which
 * itself renders a native `<label>` element. The wrapper adds:
 *  - `data-slot="label"` for styling/testing hooks.
 *  - A fixed set of Tailwind utility classes (flex layout, text sizing,
 *    `select-none`, plus `group-data-[disabled]`/`peer-disabled` variants)
 *    merged with any caller-supplied `className` via `cn` (clsx +
 *    tailwind-merge).
 *  - Full prop forwarding (`...props`), including `htmlFor`, event
 *    handlers, and arbitrary DOM attributes, straight onto `Label.Root`.
 *
 * It holds no internal state, touches no context/provider, does no i18n,
 * and does no routing, so these tests render it directly with RTL's
 * `render`/`screen` -- no provider wrapper and no mocking of any kind
 * (matching the Badge/SplitButton tests' approach for similarly "pure"
 * presentational components in this directory). The one behavior worth
 * exercising beyond a plain smoke render is the native label/input
 * association via `htmlFor`, since that's the entire functional point of
 * using a `<label>` element instead of a `<span>`.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Label } from "./label";

// Label renders Radix's Label.Root, which is a native <label> element.
// Given children text and no special props, it should just render that
// text inside a <label> tag stamped with data-slot="label".
describe("Label rendering", () => {
  it("renders its children inside a native label element", () => {
    render(<Label>Full name</Label>);

    const label = screen.getByText("Full name");
    expect(label.tagName).toBe("LABEL");
  });

  it("stamps data-slot='label' and the base layout/typography classes", () => {
    render(<Label>Full name</Label>);

    const label = screen.getByText("Full name");
    expect(label).toHaveAttribute("data-slot", "label");
    expect(label).toHaveClass("flex", "items-center", "gap-2", "text-sm", "font-medium", "select-none");
  });
});

// A <label>'s `htmlFor` attribute is what gives it its actual runtime
// behavior: clicking the label (or its text) should focus/activate the
// form control whose `id` matches `htmlFor`, exactly as native HTML
// <label>/<input> association works. This only fires when the ids match,
// so the test wires up a matching id/htmlFor pair and checks that a click
// on the label text moves focus to the input.
describe("Label htmlFor association with a form control", () => {
  it("focuses the associated input when the label is clicked", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>,
    );

    const input = screen.getByRole("textbox");
    expect(input).not.toHaveFocus();

    await user.click(screen.getByText("Email"));
    expect(input).toHaveFocus();
  });

  it("does not focus an input whose id does not match htmlFor", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="not-email" />
      </>,
    );

    const input = screen.getByRole("textbox");
    await user.click(screen.getByText("Email"));
    expect(input).not.toHaveFocus();
  });
});

// Label builds its className via `cn(<default classes>, className)`, i.e.
// clsx + tailwind-merge. A caller-supplied className should be appended
// alongside the defaults, and per tailwind-merge's conflict resolution, a
// conflicting utility from the same class group in `className` should
// override the built-in default rather than both classes coexisting.
describe("Label className merging", () => {
  it("merges a non-conflicting custom className alongside the default classes", () => {
    render(<Label className="my-custom-class">Email</Label>);

    const label = screen.getByText("Email");
    expect(label).toHaveClass("my-custom-class");
    expect(label).toHaveClass("flex", "text-sm"); // defaults still present
  });

  it("lets a conflicting utility class in className win over the default (tailwind-merge)", () => {
    render(<Label className="text-lg">Email</Label>);

    const label = screen.getByText("Email");
    expect(label).toHaveClass("text-lg");
    expect(label).not.toHaveClass("text-sm");
  });
});

// Label spreads `...props` onto Label.Root, so any extra DOM attributes or
// event handlers passed by a caller (e.g. onClick, aria-*, data-*) should
// land on the rendered <label> element unchanged.
describe("Label prop forwarding", () => {
  it("spreads arbitrary extra props (event handlers, aria/data attributes) onto the element", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Label onClick={onClick} aria-label="custom label" data-testid="my-label">
        Email
      </Label>,
    );

    const label = screen.getByTestId("my-label");
    expect(label).toHaveAttribute("aria-label", "custom label");

    await user.click(label);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
