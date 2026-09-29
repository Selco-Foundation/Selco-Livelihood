import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InstallationPlanSearch } from "./InstallationPlanSearch";

function renderSearch(overrides: Partial<React.ComponentProps<typeof InstallationPlanSearch>> = {}) {
  const onSearch = vi.fn();
  const props: React.ComponentProps<typeof InstallationPlanSearch> = {
    onSearch,
    ...overrides,
  };
  const result = render(<InstallationPlanSearch {...props} />);
  return { ...result, onSearch };
}

describe("InstallationPlanSearch", () => {
  it("renders the initial search text in the input", () => {
    renderSearch({ initialSearchText: "solar" });
    expect(screen.getByRole("textbox")).toHaveValue("solar");
  });

  it("calls onSearch with the trimmed initial text on mount", () => {
    const { onSearch } = renderSearch({ initialSearchText: "  solar  " });
    expect(onSearch).toHaveBeenCalledWith("solar");
  });

  it("calls onSearch with the typed text after the debounce settles", async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearch();
    onSearch.mockClear();

    await user.type(screen.getByRole("textbox"), "panel");

    await waitFor(() => expect(onSearch).toHaveBeenLastCalledWith("panel"));
  });

  it("clears the input and calls onSearch immediately when Clear Search is clicked", async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearch({ initialSearchText: "solar" });
    onSearch.mockClear();

    await user.click(screen.getByText("Clear Search"));

    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(onSearch).toHaveBeenCalledWith("");
  });
});
