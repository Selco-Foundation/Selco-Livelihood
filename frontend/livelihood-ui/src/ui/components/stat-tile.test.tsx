/**
 * Unit tests for the StatTile component.
 *
 * Covers: StatTile rendering with icon, label, value, and optional link prop.
 * Testing approach: Renders StatTile directly for non-link variant; wraps in a
 * TanStack Router (with MemoryHistory) for the link-enabled variant to test the Link wrapper.
 */
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile } from "./stat-tile";

/**
 * StatTile: A styled metric card displaying icon, label, and numeric/string value.
 * Inputs: icon (ReactNode), label (string), value (string | number), link (optional string route).
 * If link is provided, wraps the card in a TanStack Router Link; otherwise renders the card standalone.
 */
describe("StatTile", () => {
  it("renders the label and value without a link wrapper when link is omitted", () => {
    render(<StatTile icon={<span>icon</span>} label="Total" value={42} />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("wraps the card in a Link when link is provided", async () => {
    const rootRoute = createRootRoute({
      component: () => (
        <StatTile icon={<span>icon</span>} label="Total" value={42} link="/somewhere" />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    render(<RouterProvider router={router} />);

    const link = await screen.findByRole("link");
    expect(link).toHaveAttribute("href", "/somewhere");
    expect(screen.getByText("Total")).toBeInTheDocument();
  });
});
