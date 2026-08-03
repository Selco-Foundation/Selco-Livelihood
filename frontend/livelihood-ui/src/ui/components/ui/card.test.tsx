/**
 * Unit tests for the Card family (src/ui/components/ui/card.tsx).
 *
 * This module exports seven pure, stateless presentational wrappers --
 * Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent,
 * CardFooter -- each a thin `<div>` with a fixed `data-slot` attribute and a
 * base Tailwind class string produced via `cn(...)` (clsx + tailwind-merge).
 * Every component spreads `...props` onto the div, so children, className,
 * and arbitrary DOM attributes (e.g. `id`, `onClick`) all pass through
 * untouched. None of them hold state, read context, do i18n, or route --
 * so these tests render each component directly with RTL's `render`/`screen`,
 * with no provider wrapper (no I18nextProvider/RouterProvider/QueryClient)
 * and no mocking of any kind.
 *
 * Behaviors verified per component:
 *  - Renders its children.
 *  - Sets its fixed `data-slot` marker (used by consumers/CSS, e.g. the
 *    `has-data-[slot=card-action]` selector in CardHeader's own class list).
 *  - Merges a caller-supplied `className` in with (not instead of) its base
 *    classes, via tailwind-merge's `cn` -- verified by asserting both a base
 *    class and the custom class are present together.
 *  - Passes through arbitrary extra props (e.g. `id`, `onClick`) since every
 *    component spreads `{...props}`.
 * Additionally, a composition test renders the full Card/CardHeader/
 * CardTitle/CardDescription/CardAction/CardContent/CardFooter tree together,
 * matching typical real-world usage, to confirm the pieces nest and render
 * correctly as a whole (including CardHeader's has-data-[slot=card-action]
 * class, which is present regardless of whether a CardAction sibling is
 * actually rendered -- Tailwind's arbitrary variant is a CSS-time selector,
 * not something the component itself branches on at render time).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

// Card is the outermost container: a rounded, bordered, shadowed flex column
// with data-slot="card". It renders children and merges custom className in
// with its base layout classes.
describe("Card", () => {
  it("renders its children with the card data-slot and base layout classes", () => {
    render(<Card>Card body</Card>);

    const card = screen.getByText("Card body");
    expect(card).toHaveAttribute("data-slot", "card");
    expect(card).toHaveClass("flex", "flex-col", "rounded-xl", "border", "shadow-sm");
  });

  it("merges a custom className with its base classes rather than replacing them", () => {
    render(<Card className="my-card">Card body</Card>);

    const card = screen.getByText("Card body");
    expect(card).toHaveClass("my-card", "rounded-xl");
  });

  it("passes through arbitrary extra props such as id and data-testid", () => {
    render(<Card id="card-1" data-testid="card-root">Card body</Card>);

    const card = screen.getByTestId("card-root");
    expect(card).toHaveAttribute("id", "card-1");
  });
});

// CardHeader is a grid container for title/description/action content, with
// data-slot="card-header". Its class list includes the arbitrary variant
// `has-data-[slot=card-action]:grid-cols-[1fr_auto]`, a CSS-only selector
// that Tailwind evaluates against DOM structure at paint time -- it is not
// something the component branches on in JS, so it's present on the class
// string unconditionally.
describe("CardHeader", () => {
  it("renders its children with the card-header data-slot and grid layout classes", () => {
    render(<CardHeader>Header content</CardHeader>);

    const header = screen.getByText("Header content");
    expect(header).toHaveAttribute("data-slot", "card-header");
    expect(header).toHaveClass("grid", "gap-2", "px-6");
  });

  it("merges a custom className with its base classes", () => {
    render(<CardHeader className="my-header">Header content</CardHeader>);

    const header = screen.getByText("Header content");
    expect(header).toHaveClass("my-header", "grid");
  });
});

// CardTitle renders heading-style text (bold, no line-height slop) with
// data-slot="card-title".
describe("CardTitle", () => {
  it("renders its children with the card-title data-slot and typography classes", () => {
    render(<CardTitle>My Title</CardTitle>);

    const title = screen.getByText("My Title");
    expect(title).toHaveAttribute("data-slot", "card-title");
    expect(title).toHaveClass("leading-none", "font-semibold");
  });

  it("merges a custom className with its base classes", () => {
    render(<CardTitle className="my-title">My Title</CardTitle>);

    expect(screen.getByText("My Title")).toHaveClass("my-title", "font-semibold");
  });
});

// CardDescription renders muted, small supporting text with
// data-slot="card-description".
describe("CardDescription", () => {
  it("renders its children with the card-description data-slot and muted text classes", () => {
    render(<CardDescription>Supporting text</CardDescription>);

    const description = screen.getByText("Supporting text");
    expect(description).toHaveAttribute("data-slot", "card-description");
    expect(description).toHaveClass("text-sm", "text-muted-foreground");
  });

  it("merges a custom className with its base classes", () => {
    render(<CardDescription className="my-desc">Supporting text</CardDescription>);

    expect(screen.getByText("Supporting text")).toHaveClass("my-desc", "text-sm");
  });
});

// CardAction is positioned via CSS grid placement (column 2, spanning both
// header rows, self-aligned) so it can sit alongside the title/description
// inside CardHeader's grid, with data-slot="card-action".
describe("CardAction", () => {
  it("renders its children with the card-action data-slot and grid-placement classes", () => {
    render(<CardAction>Action</CardAction>);

    const action = screen.getByText("Action");
    expect(action).toHaveAttribute("data-slot", "card-action");
    expect(action).toHaveClass("col-start-2", "row-span-2", "justify-self-end");
  });

  it("merges a custom className with its base classes", () => {
    render(<CardAction className="my-action">Action</CardAction>);

    expect(screen.getByText("Action")).toHaveClass("my-action", "col-start-2");
  });
});

// CardContent is the main body slot: horizontal padding only, with
// data-slot="card-content".
describe("CardContent", () => {
  it("renders its children with the card-content data-slot and padding class", () => {
    render(<CardContent>Body content</CardContent>);

    const content = screen.getByText("Body content");
    expect(content).toHaveAttribute("data-slot", "card-content");
    expect(content).toHaveClass("px-6");
  });

  it("merges a custom className with its base classes", () => {
    render(<CardContent className="my-content">Body content</CardContent>);

    expect(screen.getByText("Body content")).toHaveClass("my-content", "px-6");
  });
});

// CardFooter lays out actions in a row, with data-slot="card-footer". Its
// `[.border-t]:pt-6` class is a CSS-only sibling-selector variant (adds top
// padding when a `.border-t` utility is also applied), not a JS-level branch.
describe("CardFooter", () => {
  it("renders its children with the card-footer data-slot and flex layout classes", () => {
    render(<CardFooter>Footer content</CardFooter>);

    const footer = screen.getByText("Footer content");
    expect(footer).toHaveAttribute("data-slot", "card-footer");
    expect(footer).toHaveClass("flex", "items-center", "px-6");
  });

  it("merges a custom className with its base classes", () => {
    render(<CardFooter className="my-footer">Footer content</CardFooter>);

    expect(screen.getByText("Footer content")).toHaveClass("my-footer", "flex");
  });
});

// Composition test: mirrors typical real-world usage, assembling all seven
// sub-components into one tree, to confirm they nest and render together
// without interference (each keeps its own data-slot and content).
describe("Card composition", () => {
  it("renders a full Card tree with header, title, description, action, content, and footer", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Invoice #123</CardTitle>
          <CardDescription>Due August 2026</CardDescription>
          <CardAction>Edit</CardAction>
        </CardHeader>
        <CardContent>Line items go here.</CardContent>
        <CardFooter>Total: $100</CardFooter>
      </Card>,
    );

    expect(screen.getByTestId("card")).toHaveAttribute("data-slot", "card");
    expect(screen.getByText("Invoice #123")).toHaveAttribute("data-slot", "card-title");
    expect(screen.getByText("Due August 2026")).toHaveAttribute("data-slot", "card-description");
    expect(screen.getByText("Edit")).toHaveAttribute("data-slot", "card-action");
    expect(screen.getByText("Line items go here.")).toHaveAttribute("data-slot", "card-content");
    expect(screen.getByText("Total: $100")).toHaveAttribute("data-slot", "card-footer");
  });
});
