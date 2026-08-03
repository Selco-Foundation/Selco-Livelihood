/**
 * Unit tests for ImBreadcrumbs (src/modules/im/components/ImBreadcrumbs.tsx).
 *
 * Covers the single exported component, `ImBreadcrumbs`, which is a thin,
 * stateless presentational wrapper around the `@/ui` Breadcrumb primitives:
 * given a `items: ImBreadcrumbItem[]` prop, it maps each `{ label, to? }`
 * entry to a `BreadcrumbItem` containing either
 *  - a router `<Link to={item.to}>` (wrapped in `BreadcrumbLink asChild`)
 *    when `item.to` is present, or
 *  - a non-navigable `BreadcrumbPage` (plain text, `aria-current="page"`)
 *    when `item.to` is omitted,
 * and inserts a `BreadcrumbSeparator` before every item except the first
 * (the `index > 0` guard in the source's `flatMap`).
 *
 * Testing approach: the component renders `@tanstack/react-router`'s `Link`,
 * which requires a real router context to resolve `to` targets, so every
 * test uses `renderWithProviders(..., { withRouter: true })` (real
 * `RouterProvider` built via `createMemoryHistory` + `createRootRoute`) per
 * this suite's convention, rather than mocking `Link` directly -- this
 * proves the rendered anchor actually carries a real, router-resolved
 * `href`. The Breadcrumb primitives themselves are already unit tested in
 * `src/ui/components/ui/breadcrumb.test.tsx` and are not re-verified here;
 * this file only exercises `ImBreadcrumbs`'s own mapping/branching logic.
 * No i18n resources or API mocking are needed since the component takes
 * pre-resolved labels as props and performs no data fetching or
 * translation of its own.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/render-with-providers";
import { ImBreadcrumbs, type ImBreadcrumbItem } from "./ImBreadcrumbs";

function renderBreadcrumbs(items: ImBreadcrumbItem[]) {
  return renderWithProviders(<ImBreadcrumbs items={items} />, { withRouter: true });
}

// ImBreadcrumbs takes an ordered list of `{ label, to? }` items and renders
// them inside a Breadcrumb/BreadcrumbList, choosing a navigable Link vs. a
// static "current page" crumb per item based on whether `to` is set, and
// inserting a separator between (but not before) items.
describe("ImBreadcrumbs", () => {
  it("renders a single item without a `to` as a non-navigable current-page crumb, with no separator", async () => {
    renderBreadcrumbs([{ label: "Inbox" }]);

    const page = await screen.findByText("Inbox");
    expect(page).toHaveAttribute("aria-current", "page");
    expect(page).toHaveAttribute("aria-disabled", "true");
    // BreadcrumbPage renders a <span>, not an <a>, even though it sets
    // role="link" for accessibility -- assert on the tag/href rather than
    // the ARIA role, since the role alone can't distinguish it from a real link.
    expect(page.tagName).toBe("SPAN");
    expect(page).not.toHaveAttribute("href");
    // Single item -> index 0 -> the `index > 0` guard never fires.
    expect(document.querySelectorAll('[data-slot="breadcrumb-separator"]')).toHaveLength(0);
  });

  it("renders a single item with `to` as a navigable link pointing at that route", async () => {
    renderBreadcrumbs([{ label: "Inbox", to: "/inbox" }]);

    const link = await screen.findByRole("link", { name: "Inbox" });
    expect(link).toHaveAttribute("href", "/inbox");
    expect(screen.queryByText("Inbox", { selector: '[aria-current="page"]' })).not.toBeInTheDocument();
  });

  // Business rule under test: the component's `flatMap` only pushes a
  // BreadcrumbSeparator when `index > 0`, so with N items there must be
  // exactly N-1 separators, positioned strictly between items (not
  // leading or trailing).
  it("renders a full trail with links for items that have `to` and a current-page crumb for the last item, separated correctly", async () => {
    renderBreadcrumbs([
      { label: "Inbox", to: "/inbox" },
      { label: "Complaints", to: "/inbox/complaints" },
      { label: "INC-1" },
    ]);

    const inboxLink = await screen.findByRole("link", { name: "Inbox" });
    const complaintsLink = screen.getByRole("link", { name: "Complaints" });
    expect(inboxLink).toHaveAttribute("href", "/inbox");
    expect(complaintsLink).toHaveAttribute("href", "/inbox/complaints");

    const currentPage = screen.getByText("INC-1");
    expect(currentPage).toHaveAttribute("aria-current", "page");
    expect(currentPage).toHaveAttribute("data-slot", "breadcrumb-page");

    // 3 items -> exactly 2 separators (before item 2 and before item 3).
    expect(document.querySelectorAll('[data-slot="breadcrumb-separator"]')).toHaveLength(2);

    // Order matters: items must appear in the DOM in the order supplied.
    const list = screen.getByRole("list");
    expect(list).toHaveTextContent(/Inbox.*Complaints.*INC-1/);
  });

  it("renders nothing inside the list when `items` is empty", async () => {
    renderBreadcrumbs([]);

    // The RouterProvider resolves its route tree asynchronously, so the
    // BreadcrumbList (and its "list" role) isn't in the DOM on first render --
    // use findByRole rather than getByRole to await that resolution.
    const list = await screen.findByRole("list");
    expect(list).toBeEmptyDOMElement();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
