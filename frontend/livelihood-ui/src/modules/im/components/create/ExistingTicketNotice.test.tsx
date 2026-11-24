import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { contextPath } from "@/shared";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { ExistingTicketNotice } from "./ExistingTicketNotice";

describe("ExistingTicketNotice", () => {
  it("shows the duplicate message with the existing ticket number as a link to its details page", () => {
    render(<ExistingTicketNotice ticket={{ ticketId: "LH-1", ticketTenantId: "tenant-1" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "You already have a ticket raised for this asset with the same issue. Please refer to the existing ticket: LH-1",
    );
    const link = screen.getByRole("link", { name: "LH-1" });
    expect(link).toHaveAttribute(
      "href",
      `/${contextPath()}/employee/im/complaint/details/LH-1/tenant-1`,
    );
    expect(link).toHaveAttribute("target", "_blank");
  });
});
