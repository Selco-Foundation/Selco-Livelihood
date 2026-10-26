import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormSelectField, type SelectOption } from "./FormSelectField";

const options: SelectOption[] = [
  { code: "opt-3", name: "Charlie" },
  { code: "opt-1", name: "Alpha" },
  { code: "opt-2", name: "Beta" },
];

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

describe("FormSelectField (org)", () => {
  it("renders options sorted by name, ascending, regardless of the input order", async () => {
    const user = userEvent.setup();
    render(<FormSelectField label="State" value="" options={options} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));

    const optionButtons = screen
      .getAllByRole("button")
      .filter((button) => options.some((option) => button.textContent?.includes(option.name)));
    expect(optionButtons.map((button) => button.textContent)).toEqual(["Alpha", "Beta", "Charlie"]);
  });

  it("calls onChange with the picked option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormSelectField label="State" value="" options={options} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Beta"));

    expect(onChange).toHaveBeenCalledWith(options[2]);
  });

  it("shows the selected option's name when value matches an option", () => {
    render(<FormSelectField label="State" value="opt-1" options={options} onChange={vi.fn()} />);

    expect(screen.getByRole("button")).toHaveTextContent("Alpha");
  });

  it("filters the sorted option list by the search text when searchable", async () => {
    const user = userEvent.setup();
    render(<FormSelectField label="State" value="" options={options} onChange={vi.fn()} searchable />);

    await user.click(screen.getByRole("button"));
    await user.type(screen.getByPlaceholderText("Search"), "harlie");

    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });
});
