/**
 * Unit tests for FormSelectField.
 *
 * FormSelectField is a searchable single-select combobox built on the
 * Popover primitive: it shows a trigger button (selected option name or a
 * placeholder), and a popover with a search input that filters the option
 * list case-insensitively. Selecting an option calls `onChange`, closes the
 * popover, and clears the search query; closing the popover any other way
 * also clears the query so reopening starts from a clean search box.
 *
 * Testing approach:
 * - The component is rendered inside a real `I18nextProvider` (via
 *   `createTestI18n`) with empty translation resources rather than mocking
 *   `useTranslate`/`translateOr`. Because those resources are empty,
 *   `translateOr` falls back to its English default strings (e.g. "Select",
 *   "Search", "No options found"), so tests can assert on the literal
 *   fallback text without needing real translation keys.
 * - No other mocking is needed: `onChange` is a plain `vi.fn()` spy, and all
 *   interactions (opening the popover, typing in the search box, clicking an
 *   option) are driven through `@testing-library/user-event` against the
 *   real rendered DOM.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type { SelectOption } from "../../types/create-incident";
import { FormSelectField } from "./FormSelectField";

// Creates an isolated i18next instance per test with no translation
// resources loaded, so `translateOr` calls inside the component always fall
// through to their hardcoded English defaults (e.g. "Select", "Search").
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

// FormSelectField renders a trigger button showing either the option whose
// `code` matches the `value` prop or a placeholder, plus a Popover containing
// a search input and the (optionally filtered) option list. Selecting an
// option or dismissing the popover both reset the search query, so the
// search box always starts empty on next open. It also renders an optional
// `error` message and can be fully disabled via the `disabled` prop.
describe("FormSelectField", () => {
  it("shows the placeholder when nothing is selected", () => {
    renderField();
    expect(screen.getByText("Select")).toBeInTheDocument();
  });

  // `selectedOption` is derived by matching `options[].code` against `value`
  // (not by index or object identity), so passing a matching code alone must
  // resolve to the correct option's display name.
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

  // `filteredOptions` normalizes the query (trim + lowercase) and matches it
  // against `option.name` with `includes`, so typing a lowercase partial
  // substring of "Banana" must still match it while excluding non-matching
  // options like "Apple".
  it("filters options case-insensitively as the user types in the search box", async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole("button"));
    await user.type(screen.getByPlaceholderText("Search"), "ban");

    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
  });

  // When `filteredOptions` is empty, the component swaps the option buttons
  // for a "no options" message instead of rendering an empty list.
  it("shows a no-options message when the search matches nothing", async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole("button"));
    await user.type(screen.getByPlaceholderText("Search"), "zzz");

    expect(screen.getByText("No options found")).toBeInTheDocument();
  });

  // Clicking an option button calls `onChange` with the full matching
  // `SelectOption` object (not just its code), and also closes the popover
  // and clears the query as a side effect of the same click handler.
  it("calls onChange with the selected option and closes the popover", async () => {
    const user = userEvent.setup();
    const { onChange } = renderField();

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Cherry"));

    expect(onChange).toHaveBeenCalledWith({ code: "C1", name: "Cherry" });
  });

  // Business rule: the search query is reset both on option selection and on
  // `Popover`'s `onOpenChange` firing with `nextOpen === false`, so reopening
  // the popover after a prior search must show an empty search box rather
  // than the stale query.
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
