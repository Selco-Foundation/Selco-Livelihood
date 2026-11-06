import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectSearch } from "./ProjectSearch";

describe("ProjectSearch", () => {
  it("calls onSearch (debounced) with the trimmed typed text", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<ProjectSearch onSearch={onSearch} />);

    await user.type(screen.getByLabelText("Search Project"), "  Solar Park  ");

    await waitFor(() => expect(onSearch).toHaveBeenLastCalledWith("Solar Park"));
  });

  it("calls onSearch with the initial value on mount", async () => {
    const onSearch = vi.fn();
    render(<ProjectSearch initialSearchText="Foo" onSearch={onSearch} />);

    await waitFor(() => expect(onSearch).toHaveBeenCalledWith("Foo"));
  });

  it("shows a clear button only once there is text, and clears on click", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<ProjectSearch onSearch={onSearch} />);

    expect(screen.queryByRole("button", { name: "Clear Search" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Search Project"), "Foo");
    const clearButton = await screen.findByRole("button", { name: "Clear Search" });
    await user.click(clearButton);

    expect(screen.getByLabelText("Search Project")).toHaveValue("");
    await waitFor(() => expect(onSearch).toHaveBeenLastCalledWith(""));
  });
});
