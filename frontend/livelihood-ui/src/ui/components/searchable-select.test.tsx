import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchableSelect, type SearchableSelectOption } from "./searchable-select";

const options: SearchableSelectOption[] = [
  { code: "org-1", name: "Vendor One" },
  { code: "org-2", name: "Vendor Two" },
];

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

describe("SearchableSelect", () => {
  it("shows the placeholder when nothing is selected", () => {
    render(<SearchableSelect label="Vendor" value="" options={options} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /^Vendor/ })).toHaveTextContent("Select");
  });

  it("shows the selected option's name when value matches an option", () => {
    render(<SearchableSelect label="Vendor" value="org-1" options={options} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Vendor Vendor One/ })).toBeInTheDocument();
  });

  it("uses ariaLabel as the accessible name when no visible label is given", () => {
    render(<SearchableSelect ariaLabel="Vendor, Site One" value="" options={options} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Vendor, Site One" })).toBeInTheDocument();
  });

  it("opens the option list and calls onChange with the picked option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchableSelect label="Vendor" value="" options={options} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /^Vendor/ }));
    await user.click(screen.getByText("Vendor Two"));

    expect(onChange).toHaveBeenCalledWith(options[1]);
  });

  it("filters the option list by the search text", async () => {
    const user = userEvent.setup();
    render(<SearchableSelect label="Vendor" value="" options={options} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Vendor/ }));
    await user.type(screen.getByPlaceholderText("Search"), "two");

    expect(screen.getByText("Vendor Two")).toBeInTheDocument();
    expect(screen.queryByText("Vendor One")).not.toBeInTheDocument();
  });

  it("shows a no-options message when nothing matches the search", async () => {
    const user = userEvent.setup();
    render(<SearchableSelect label="Vendor" value="" options={options} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Vendor/ }));
    await user.type(screen.getByPlaceholderText("Search"), "zzz");

    expect(screen.getByText("No options found")).toBeInTheDocument();
  });

  it("disables the trigger when disabled", () => {
    render(<SearchableSelect label="Vendor" value="" options={options} onChange={vi.fn()} disabled />);

    expect(screen.getByRole("button", { name: /^Vendor/ })).toBeDisabled();
  });

  it("shows the error message when given one", () => {
    render(<SearchableSelect label="Vendor" value="" options={options} onChange={vi.fn()} error="Required" />);

    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("resets the search query after picking an option", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SearchableSelect label="Vendor" value="" options={options} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Vendor/ }));
    await user.type(screen.getByPlaceholderText("Search"), "two");
    await user.click(screen.getByText("Vendor Two"));

    // The component is controlled: selecting closes the popover, but the trigger only reflects
    // the new value once the parent re-renders with it (as a real caller's onChange handler would).
    rerender(<SearchableSelect label="Vendor" value="org-2" options={options} onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Vendor Two/ }));

    expect(screen.getByPlaceholderText("Search")).toHaveValue("");
  });
});
