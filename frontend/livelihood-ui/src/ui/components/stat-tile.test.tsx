import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatTile } from "./stat-tile";

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

describe("StatTile", () => {
  it("renders the label, value and icon", () => {
    render(<StatTile icon={<svg data-testid="icon" />} label="Total Plans" value={42} />);

    expect(screen.getByText("Total Plans")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders a string value as-is", () => {
    render(<StatTile icon={<svg />} label="Status" value="Active" />);

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("does not render a link when no `link` prop is given", () => {
    render(<StatTile icon={<svg />} label="Total Plans" value={42} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("wraps the tile in a link pointing at `link` when given", () => {
    render(<StatTile icon={<svg />} label="Total Plans" value={42} link="/plans" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/plans");
    expect(link).toHaveTextContent("Total Plans");
    expect(link).toHaveTextContent("42");
  });
});
