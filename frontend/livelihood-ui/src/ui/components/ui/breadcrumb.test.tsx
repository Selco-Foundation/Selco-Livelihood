/**
 * Unit tests for the Breadcrumb primitives (src/ui/components/ui/breadcrumb.tsx).
 *
 * This is a stock shadcn-style wrapper composed of seven small, stateless
 * presentational components, each rendering a single native HTML element
 * (or, for BreadcrumbLink, optionally a Radix `Slot` in place of an `<a>`)
 * with fixed accessibility attributes/roles and Tailwind classes, plus
 * pass-through of arbitrary props (className, onClick, children, etc.):
 *
 *  - Breadcrumb: `<nav aria-label="breadcrumb">` -- the root landmark.
 *  - BreadcrumbList: `<ol>` -- the list container.
 *  - BreadcrumbItem: `<li>` -- one crumb.
 *  - BreadcrumbLink: `<a>` by default, or (via `asChild`) renders its single
 *    child element directly through Radix's `Slot.Root`, merging this
 *    component's props/className onto that child instead of wrapping it in
 *    an extra `<a>`.
 *  - BreadcrumbPage: `<span role="link" aria-disabled="true" aria-current="page">`
 *    -- the current, non-navigable crumb.
 *  - BreadcrumbSeparator: `<li role="presentation" aria-hidden="true">` --
 *    renders its `children` if given, otherwise defaults to a `ChevronRight`
 *    icon.
 *  - BreadcrumbEllipsis: `<span role="presentation" aria-hidden="true">` --
 *    always renders a `MoreHorizontal` icon plus visually-hidden "More" text.
 *
 * None of these components hold internal state, read context, do routing,
 * or do i18n, so every test renders directly with RTL's `render`/`screen`
 * -- no provider wrapper (no router, no i18n, no query client) and no
 * mocking of any kind. Icons from lucide-react are real SVGs (not mocked);
 * asserting their presence via `container.querySelector("svg")` is enough
 * to confirm the correct icon branch rendered without depending on
 * lucide's internal DOM shape.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

// Breadcrumb renders a <nav aria-label="breadcrumb" data-slot="breadcrumb">
// and spreads through any other props (e.g. className) unchanged.
describe("Breadcrumb", () => {
  it("renders a nav landmark labeled 'breadcrumb' with its children", () => {
    render(
      <Breadcrumb>
        <span>crumbs</span>
      </Breadcrumb>,
    );

    const nav = screen.getByRole("navigation", { name: "breadcrumb" });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("data-slot", "breadcrumb");
    expect(nav).toHaveTextContent("crumbs");
  });

  it("passes through arbitrary props such as className", () => {
    render(<Breadcrumb className="custom-nav" data-testid="crumb-nav" />);

    expect(screen.getByTestId("crumb-nav")).toHaveClass("custom-nav");
  });
});

// BreadcrumbList renders an <ol> with layout classes merged with any
// caller-supplied className via `cn`.
describe("BreadcrumbList", () => {
  it("renders an ordered list carrying its base layout classes", () => {
    render(
      <BreadcrumbList data-testid="crumb-list">
        <li>item</li>
      </BreadcrumbList>,
    );

    const list = screen.getByTestId("crumb-list");
    expect(list.tagName).toBe("OL");
    expect(list).toHaveAttribute("data-slot", "breadcrumb-list");
    expect(list).toHaveClass("flex", "flex-wrap", "items-center");
  });

  it("merges a custom className alongside the base classes", () => {
    render(<BreadcrumbList className="custom-list" data-testid="crumb-list" />);

    const list = screen.getByTestId("crumb-list");
    expect(list).toHaveClass("custom-list");
    expect(list).toHaveClass("flex");
  });
});

// BreadcrumbItem renders an <li> wrapping one crumb (label + optional
// trailing content), with its own inline-flex layout classes.
describe("BreadcrumbItem", () => {
  it("renders a list item with its children and base classes", () => {
    render(
      <BreadcrumbItem data-testid="crumb-item">
        <span>Home</span>
      </BreadcrumbItem>,
    );

    const item = screen.getByTestId("crumb-item");
    expect(item.tagName).toBe("LI");
    expect(item).toHaveAttribute("data-slot", "breadcrumb-item");
    expect(item).toHaveClass("inline-flex", "items-center");
    expect(item).toHaveTextContent("Home");
  });
});

// BreadcrumbLink renders an <a> by default. When `asChild` is true, it swaps
// the rendered element for Radix's Slot, which merges this component's own
// props (className, data-slot, etc.) onto the single child element instead
// of introducing a wrapping <a> -- this is the key branch to verify, since
// callers use `asChild` to compose the link with a router's own Link component.
describe("BreadcrumbLink", () => {
  it("renders an anchor tag with the given href by default", () => {
    render(<BreadcrumbLink href="/home">Home</BreadcrumbLink>);

    const link = screen.getByRole("link", { name: "Home" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/home");
    expect(link).toHaveAttribute("data-slot", "breadcrumb-link");
  });

  // asChild=true delegates rendering to Radix Slot.Root, which clones the
  // single child and merges props onto it -- so the DOM should contain the
  // child's own tag (here <button>), not an extra wrapping <a>, while still
  // receiving the breadcrumb-link's data-slot/className.
  it("merges props onto the child element instead of wrapping it in an <a> when asChild is true", () => {
    render(
      <BreadcrumbLink asChild className="child-class">
        <button type="button">Custom child</button>
      </BreadcrumbLink>,
    );

    const rendered = screen.getByRole("button", { name: "Custom child" });
    expect(rendered.tagName).toBe("BUTTON");
    expect(rendered).toHaveAttribute("data-slot", "breadcrumb-link");
    expect(rendered).toHaveClass("child-class");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

// BreadcrumbPage renders the non-interactive "current page" crumb: a <span>
// styled and annotated (role="link", aria-disabled, aria-current="page") to
// read as the active, non-navigable breadcrumb entry to assistive tech.
describe("BreadcrumbPage", () => {
  it("renders a span with current-page aria semantics", () => {
    render(<BreadcrumbPage>Current</BreadcrumbPage>);

    const page = screen.getByText("Current");
    expect(page.tagName).toBe("SPAN");
    expect(page).toHaveAttribute("data-slot", "breadcrumb-page");
    expect(page).toHaveAttribute("role", "link");
    expect(page).toHaveAttribute("aria-disabled", "true");
    expect(page).toHaveAttribute("aria-current", "page");
  });
});

// BreadcrumbSeparator renders a decorative <li role="presentation"
// aria-hidden="true">. Its content defaults to a ChevronRight icon
// (`children ?? <ChevronRight />`), but a caller-supplied children
// overrides that default entirely.
describe("BreadcrumbSeparator", () => {
  it("defaults to rendering a ChevronRight icon when no children are given", () => {
    const { container } = render(<BreadcrumbSeparator data-testid="sep" />);

    const separator = screen.getByTestId("sep");
    expect(separator.tagName).toBe("LI");
    expect(separator).toHaveAttribute("role", "presentation");
    expect(separator).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  // Business rule: `children ?? <ChevronRight />` -- supplying children
  // (even a non-icon string) must suppress the default chevron entirely,
  // not render alongside it.
  it("renders the supplied children instead of the default chevron icon when children are given", () => {
    const { container } = render(
      <BreadcrumbSeparator data-testid="sep">/</BreadcrumbSeparator>,
    );

    const separator = screen.getByTestId("sep");
    expect(separator).toHaveTextContent("/");
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});

// BreadcrumbEllipsis renders a decorative <span role="presentation"
// aria-hidden="true"> that always shows a MoreHorizontal icon plus a
// visually-hidden "More" label for screen readers -- it takes no children,
// so there is no variant to branch on.
describe("BreadcrumbEllipsis", () => {
  it("renders a presentational span with a MoreHorizontal icon and sr-only 'More' text", () => {
    const { container } = render(<BreadcrumbEllipsis data-testid="ellipsis" />);

    const ellipsis = screen.getByTestId("ellipsis");
    expect(ellipsis.tagName).toBe("SPAN");
    expect(ellipsis).toHaveAttribute("role", "presentation");
    expect(ellipsis).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("svg")).toBeInTheDocument();

    const srText = ellipsis.querySelector(".sr-only");
    expect(srText).toHaveTextContent("More");
  });
});

// Full composition: verifies the pieces render together the way a real
// breadcrumb trail would be assembled by a consumer -- root nav > list >
// items (link, separator, current page) -- with the expected roles/text
// all present at once, exercising the components' natural nesting.
describe("Breadcrumb composition", () => {
  it("renders a full breadcrumb trail with link, separator, and current page", () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Current Project</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projects");

    const currentPage = screen.getByText("Current Project");
    expect(currentPage).toHaveAttribute("aria-current", "page");

    // Two separators between three items. `role="presentation"` on an <li>
    // inside an <ol> is overridden back to the implicit `listitem` role by
    // ARIA's "presentational roles conflict resolution", so query by the
    // element's `data-slot` marker instead of via getAllByRole.
    expect(container.querySelectorAll('[data-slot="breadcrumb-separator"]')).toHaveLength(2);
  });
});
