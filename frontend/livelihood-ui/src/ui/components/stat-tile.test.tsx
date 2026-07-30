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
