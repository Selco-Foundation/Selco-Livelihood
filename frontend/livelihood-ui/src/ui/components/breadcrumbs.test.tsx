import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Breadcrumbs, type BreadcrumbEntry } from "./breadcrumbs";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("Breadcrumbs", () => {
  it("renders each item's label", () => {
    const items: BreadcrumbEntry[] = [
      { label: "Home", to: "/home" },
      { label: "Details" },
    ];
    render(<Breadcrumbs items={items} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("renders an item with a `to` as a link pointing at that path", () => {
    render(<Breadcrumbs items={[{ label: "Home", to: "/home" }]} />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/home");
  });

  it("renders an item without a `to` as the current, disabled page — not a real anchor", () => {
    render(<Breadcrumbs items={[{ label: "Home", to: "/home" }, { label: "Current" }]} />);

    const currentPage = screen.getByText("Current");
    expect(currentPage.tagName).toBe("SPAN");
    expect(currentPage).toHaveAttribute("aria-current", "page");
    expect(currentPage).toHaveAttribute("aria-disabled", "true");
  });

  it("renders a separator between items but not before the first one", () => {
    render(
      <Breadcrumbs
        items={[{ label: "Home", to: "/home" }, { label: "Section", to: "/section" }, { label: "Current" }]}
      />,
    );

    // Separators carry `aria-hidden`, so they're excluded from the default
    // accessibility tree and must be queried with `hidden: true`.
    expect(screen.getAllByRole("presentation", { hidden: true })).toHaveLength(2);
  });

  it("renders no separator for a single item", () => {
    render(<Breadcrumbs items={[{ label: "Only" }]} />);

    expect(screen.queryByRole("presentation", { hidden: true })).not.toBeInTheDocument();
  });
});
