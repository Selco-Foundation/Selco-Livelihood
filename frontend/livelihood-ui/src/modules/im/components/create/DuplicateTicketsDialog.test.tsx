import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DuplicateTicketsDialog } from "./DuplicateTicketsDialog";

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

const tickets = [
  { ticketId: "T1", ticketTenantId: "tenant-1" },
  { ticketId: "T2", ticketTenantId: "tenant-1" },
];

describe("DuplicateTicketsDialog", () => {
  it("renders the heading, description, and every duplicate ticket as a link to its details page", () => {
    render(
      <DuplicateTicketsDialog tickets={tickets} onContinue={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByText("Potential Duplicate Tickets Found")).toBeInTheDocument();
    expect(
      screen.getByText("Similar tickets already exist for this asset and issue type."),
    ).toBeInTheDocument();

    const t1Link = screen.getByRole("link", { name: "T1" });
    expect(t1Link).toHaveAttribute(
      "href",
      "/livelihood-ui/employee/im/complaint/details/T1/tenant-1",
    );
    const t2Link = screen.getByRole("link", { name: "T2" });
    expect(t2Link).toHaveAttribute(
      "href",
      "/livelihood-ui/employee/im/complaint/details/T2/tenant-1",
    );
  });

  it("separates multiple ticket links with a comma but not after the last one", () => {
    render(
      <DuplicateTicketsDialog tickets={tickets} onContinue={vi.fn()} onCancel={vi.fn()} />,
    );

    const paragraph = screen.getByText("Existing tickets", { exact: false }).closest("p");
    expect(paragraph?.textContent).toBe("Existing tickets: T1, T2");
  });

  it("calls onContinue when Yes is clicked", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<DuplicateTicketsDialog tickets={tickets} onContinue={onContinue} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when No is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<DuplicateTicketsDialog tickets={tickets} onContinue={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "No" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
