import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { ComplaintLinks } from "./ComplaintLinks";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("ComplaintLinks", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it("renders the Tickets header", () => {
    render(<ComplaintLinks />);
    expect(screen.getByText("Tickets")).toBeInTheDocument();
  });

  it("shows a New Ticket link pointing at the incident create route for a COMPLAINANT user", () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINANT" }] } });
    render(<ComplaintLinks />);

    const link = screen.getByRole("link", { name: "New Ticket" });
    expect(link).toHaveAttribute("href", "/livelihood-ui/employee/im/incident/create");
  });

  it("shows a New Ticket link for a LIVELIHOOD_POC user too", () => {
    useAuthStore.setState({ user: { roles: [{ code: "LIVELIHOOD_POC" }] } });
    render(<ComplaintLinks />);

    expect(screen.getByRole("link", { name: "New Ticket" })).toBeInTheDocument();
  });

  it("shows no links for a user without incident-create access", () => {
    useAuthStore.setState({ user: { roles: [{ code: "VIEWER" }] } });
    render(<ComplaintLinks />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows no links when there is no signed-in user", () => {
    render(<ComplaintLinks />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
