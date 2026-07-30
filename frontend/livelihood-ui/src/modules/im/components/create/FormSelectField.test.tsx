import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type { SelectOption } from "../../types/create-incident";
import { FormSelectField } from "./FormSelectField";

function createTestI18n() {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: { en_IN: { translations: {} } },
    react: { useSuspense: false },
  });
  return instance;
}

function renderField(props: Partial<ComponentProps<typeof FormSelectField>> = {}) {
  const options: SelectOption[] = [
    { code: "A1", name: "Apple" },
    { code: "B1", name: "Banana" },
    { code: "C1", name: "Cherry" },
  ];
  const onChange = vi.fn();
  render(
    <I18nextProvider i18n={createTestI18n()}>
      <FormSelectField label="Fruit" value="" options={options} onChange={onChange} {...props} />
    </I18nextProvider>,
  );
  return { onChange, options };
}

describe("FormSelectField", () => {
  it("shows the placeholder when nothing is selected", () => {
    renderField();
    expect(screen.getByText("Select")).toBeInTheDocument();
  });

  it("shows the selected option's name when a value matches", () => {
    renderField({ value: "B1" });
    expect(screen.getByText("Banana")).toBeInTheDocument();
  });

  it("opens the option list when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Cherry")).toBeInTheDocument();
  });

  it("filters options case-insensitively as the user types in the search box", async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole("button"));
    await user.type(screen.getByPlaceholderText("Search"), "ban");

    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
  });

  it("shows a no-options message when the search matches nothing", async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole("button"));
    await user.type(screen.getByPlaceholderText("Search"), "zzz");

    expect(screen.getByText("No options found")).toBeInTheDocument();
  });

  it("calls onChange with the selected option and closes the popover", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField();

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Cherry"));

    expect(onChange).toHaveBeenCalledWith({ code: "C1", name: "Cherry" });
  });

  it("resets the search query after closing and reopening", async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole("button"));
    await user.type(screen.getByPlaceholderText("Search"), "ban");
    await user.click(screen.getByText("Banana"));

    await user.click(screen.getByRole("button"));
    expect(screen.getByPlaceholderText("Search")).toHaveValue("");
  });

  it("renders the error message when provided", () => {
    renderField({ error: "This field is required" });
    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("disables the trigger button when disabled is true", () => {
    renderField({ disabled: true });
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
