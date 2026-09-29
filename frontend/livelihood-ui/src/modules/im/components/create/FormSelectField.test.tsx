import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SelectOption } from "../../types/create-incident";
import { FormSelectField } from "./FormSelectField";

const options: SelectOption[] = [
  { code: "A1", name: "Alpha" },
  { code: "B1", name: "Beta" },
];

async function openDropdown(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button"));
}

describe("FormSelectField", () => {
  it("renders the label and a required marker when required", () => {
    render(
      <FormSelectField label="Asset" required value="" options={options} onChange={vi.fn()} />,
    );

    expect(screen.getByText("Asset")).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("omits the required marker when not required", () => {
    render(<FormSelectField label="Asset" value="" options={options} onChange={vi.fn()} />);

    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("shows the placeholder when no option is selected", () => {
    render(<FormSelectField label="Asset" value="" options={options} onChange={vi.fn()} />);

    expect(screen.getByText("Select")).toBeInTheDocument();
  });

  it("shows a custom placeholder when given", () => {
    render(
      <FormSelectField
        label="Asset"
        value=""
        options={options}
        placeholder="Choose one"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Choose one")).toBeInTheDocument();
  });

  it("shows the selected option's name as the trigger label", () => {
    render(<FormSelectField label="Asset" value="A1" options={options} onChange={vi.fn()} />);

    expect(screen.getByRole("button")).toHaveTextContent("Alpha");
  });

  it("shows the error message when given", () => {
    render(
      <FormSelectField
        label="Asset"
        value=""
        options={options}
        error="Please select an asset"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Please select an asset")).toBeInTheDocument();
  });

  it("disables the trigger button when disabled is true", () => {
    render(
      <FormSelectField label="Asset" value="" options={options} disabled onChange={vi.fn()} />,
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("opens the dropdown and lists every option on trigger click", async () => {
    const user = userEvent.setup();
    render(<FormSelectField label="Asset" value="" options={options} onChange={vi.fn()} />);

    await openDropdown(user);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("calls onChange with the clicked option and closes the dropdown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormSelectField label="Asset" value="" options={options} onChange={onChange} />);

    await openDropdown(user);
    await user.click(screen.getByText("Beta"));

    expect(onChange).toHaveBeenCalledWith(options[1]);
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("filters options by the search query, case-insensitively", async () => {
    const user = userEvent.setup();
    render(<FormSelectField label="Asset" value="" options={options} onChange={vi.fn()} />);

    await openDropdown(user);
    await user.type(screen.getByPlaceholderText("Search"), "alp");

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("shows a no-options message when the search matches nothing", async () => {
    const user = userEvent.setup();
    render(<FormSelectField label="Asset" value="" options={options} onChange={vi.fn()} />);

    await openDropdown(user);
    await user.type(screen.getByPlaceholderText("Search"), "zzz");

    expect(screen.getByText("No options found")).toBeInTheDocument();
  });
});
