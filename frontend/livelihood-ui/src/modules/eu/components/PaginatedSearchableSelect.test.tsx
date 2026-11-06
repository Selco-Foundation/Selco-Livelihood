import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaginatedSearchableSelect, type PaginatedSearchableSelectOption } from "./PaginatedSearchableSelect";

const options: PaginatedSearchableSelectOption[] = [
  { code: "org-1", name: "Vendor One" },
  { code: "org-2", name: "Vendor Two" },
];

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

describe("PaginatedSearchableSelect", () => {
  it("shows the selected option's name when value matches an option", () => {
    render(<PaginatedSearchableSelect label="Vendor" value="org-1" options={options} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Vendor Vendor One/ })).toBeInTheDocument();
  });

  it("opens the option list and calls onChange with the picked option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PaginatedSearchableSelect label="Vendor" value="" options={options} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /^Vendor/ }));
    await user.click(screen.getByText("Vendor Two"));

    expect(onChange).toHaveBeenCalledWith(options[1]);
  });

  it("filters the already-loaded options locally while typing", async () => {
    const user = userEvent.setup();
    render(<PaginatedSearchableSelect label="Vendor" value="" options={options} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Vendor/ }));
    await user.type(screen.getByPlaceholderText("Search"), "two");

    expect(screen.getByText("Vendor Two")).toBeInTheDocument();
    expect(screen.queryByText("Vendor One")).not.toBeInTheDocument();
  });

  it("calls onQueryChange once typing settles (debounced)", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    render(
      <PaginatedSearchableSelect
        label="Vendor"
        value=""
        options={options}
        onChange={vi.fn()}
        onQueryChange={onQueryChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Vendor/ }));
    await user.type(screen.getByPlaceholderText("Search"), "acme");

    await waitFor(() => expect(onQueryChange).toHaveBeenCalledWith("acme"), { timeout: 1000 });
  });

  it("shows a 'Load more' row when hasMore is true and calls onLoadMore when clicked", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    render(
      <PaginatedSearchableSelect
        label="Vendor"
        value=""
        options={options}
        onChange={vi.fn()}
        hasMore
        onLoadMore={onLoadMore}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Vendor/ }));
    await user.click(screen.getByText("Load more"));

    expect(onLoadMore).toHaveBeenCalled();
  });

  it("does not show a 'Load more' row when hasMore is false", async () => {
    const user = userEvent.setup();
    render(<PaginatedSearchableSelect label="Vendor" value="" options={options} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Vendor/ }));

    expect(screen.queryByText("Load more")).not.toBeInTheDocument();
  });

  it("shows a loading message instead of the empty-options message while loading", async () => {
    const user = userEvent.setup();
    render(<PaginatedSearchableSelect label="Vendor" value="" options={[]} onChange={vi.fn()} isLoading />);

    await user.click(screen.getByRole("button", { name: /^Vendor/ }));

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("No options found")).not.toBeInTheDocument();
  });

  it("disables the trigger when disabled", () => {
    render(<PaginatedSearchableSelect label="Vendor" value="" options={options} onChange={vi.fn()} disabled />);

    expect(screen.getByRole("button", { name: /^Vendor/ })).toBeDisabled();
  });
});
