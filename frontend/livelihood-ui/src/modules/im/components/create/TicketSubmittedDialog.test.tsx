import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TicketSubmittedDialog } from "./TicketSubmittedDialog";

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

describe("TicketSubmittedDialog", () => {
  it("renders the submitted heading and the incident id", () => {
    render(<TicketSubmittedDialog incidentId="INC-123" inboxPath="/im/inbox" />);

    expect(screen.getByText("Ticket Submitted")).toBeInTheDocument();
    expect(screen.getByText("INC-123")).toBeInTheDocument();
  });

  it("links View inbox to the given inboxPath", () => {
    render(<TicketSubmittedDialog incidentId="INC-123" inboxPath="/im/inbox" />);

    expect(screen.getByRole("link", { name: "View inbox" })).toHaveAttribute(
      "href",
      "/im/inbox",
    );
  });

  it("links Go to home to the employee home path", () => {
    render(<TicketSubmittedDialog incidentId="INC-123" inboxPath="/im/inbox" />);

    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute(
      "href",
      "/livelihood-ui/employee",
    );
  });
});
