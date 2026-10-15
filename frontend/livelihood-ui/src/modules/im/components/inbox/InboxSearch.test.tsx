import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InboxSearch } from "./InboxSearch";

describe("InboxSearch", () => {
  it("renders the ticket number label and an empty input by default", () => {
    render(<InboxSearch onSearch={vi.fn()} />);
    expect(screen.getByText("Ticket No.")).toBeInTheDocument();
    expect(screen.getByLabelText("Ticket No.")).toHaveValue("");
  });

  it("prefills the input from initialApplicationNumber", () => {
    render(<InboxSearch onSearch={vi.fn()} initialApplicationNumber="INC-42" />);
    expect(screen.getByLabelText("Ticket No.")).toHaveValue("INC-42");
  });

  it("submits the trimmed ticket number on Search", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<InboxSearch onSearch={onSearch} />);

    await user.type(screen.getByLabelText("Ticket No."), "  INC-7  ");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith({ applicationNumber: "INC-7" });
  });

  it("submits an empty filter set when the input is blank or whitespace-only", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<InboxSearch onSearch={onSearch} />);

    await user.type(screen.getByLabelText("Ticket No."), "   ");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith({});
  });

  it("clears the input and searches with no filters when Clear Search is clicked", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<InboxSearch onSearch={onSearch} initialApplicationNumber="INC-42" />);

    await user.click(screen.getByText("Clear Search"));

    expect(screen.getByLabelText("Ticket No.")).toHaveValue("");
    expect(onSearch).toHaveBeenCalledWith({});
  });
});
