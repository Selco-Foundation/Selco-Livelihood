import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { PmOverview } from "./PmOverview";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("PmOverview", () => {
  it("renders the New Project action for a Project Manager", () => {
    useAuthStore.setState({ user: { roles: [{ code: "PROJECT_MANAGER" }] } });

    render(<PmOverview />);

    expect(screen.getByRole("link", { name: "New Project" })).toBeInTheDocument();
  });

  it("renders nothing for a non-Project-Manager", () => {
    useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });

    const { container } = render(<PmOverview />);

    expect(container).toBeEmptyDOMElement();
  });
});
