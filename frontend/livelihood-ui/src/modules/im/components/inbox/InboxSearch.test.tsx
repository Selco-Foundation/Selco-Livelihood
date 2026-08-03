/**
 * Unit tests for InboxSearch, the ticket-number search form used on the inbox screen.
 *
 * Covers: prefilling the input from `initialApplicationNumber`, trimming and forwarding
 * the entered value to `onSearch` on submit, falling back to `onSearch({})` when the
 * input is blank, and the "Clear Search" action resetting the input and re-running the
 * search with no filters.
 *
 * Testing approach: the component calls `useTranslate()` (react-i18next) and renders
 * `translateOr(t, key, fallback)` labels, so every render is wrapped in a real
 * `I18nextProvider` backed by an i18next instance with empty translation resources.
 * Because the resources are empty, `translateOr` always falls through to its English
 * fallback strings (e.g. "Ticket No.", "Search", "Clear Search"), which is what the
 * assertions query by. No mocking of `onSearch` behavior is needed beyond a `vi.fn()`
 * spy to assert on the params it was called with.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { InboxSearch } from "./InboxSearch";

// Creates a fresh, isolated i18next instance with no translation resources loaded,
// so translateOr() in the component always falls back to its English default strings.
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

// Renders InboxSearch inside the i18n provider with a fresh onSearch spy, allowing
// each test to override props (e.g. initialApplicationNumber) while sharing setup.
function renderSearch(props: Partial<ComponentProps<typeof InboxSearch>> = {}) {
  const onSearch = vi.fn();
  render(
    <I18nextProvider i18n={createTestI18n()}>
      <InboxSearch onSearch={onSearch} {...props} />
    </I18nextProvider>,
  );
  return { onSearch };
}

// InboxSearch renders a controlled ticket-number search form: a labelled input
// (seeded from the optional `initialApplicationNumber` prop), a "Search" submit
// button, and a "Clear Search" button. On submit it trims the current input value
// and calls `onSearch({ applicationNumber })` when non-empty, or `onSearch({})` when
// blank/whitespace-only. Clearing resets the input to "" and immediately calls
// `onSearch({})`. Requires `onSearch` (a callback) and works with or without
// `initialApplicationNumber`, which defaults to "".
describe("InboxSearch", () => {
  // initialApplicationNumber is meant to seed the field (e.g. deep-linking to a
  // ticket search); confirms useState's initial value wiring works.
  it("prefills the input with initialApplicationNumber", () => {
    renderSearch({ initialApplicationNumber: "INC-1" });
    expect(screen.getByLabelText("Ticket No.")).toHaveValue("INC-1");
  });

  // Business rule: handleSubmit trims surrounding whitespace before calling
  // onSearch, so "  INC-1  " must resolve to the trimmed "INC-1" and not the raw
  // typed value.
  it("submits with the trimmed applicationNumber when the input has a value", async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearch();

    await user.type(screen.getByLabelText("Ticket No."), "  INC-1  ");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith({ applicationNumber: "INC-1" });
  });

  // Business rule: submitting with no input must not send an applicationNumber key
  // at all (an empty object), so downstream consumers treat it as "no filter"
  // rather than filtering on an empty string.
  it("submits an empty object when the input is blank", async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearch();

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith({});
  });

  // Clear Search must both reset the visible input state to "" and immediately
  // trigger onSearch({}) so the parent list re-fetches with no filters applied,
  // even though the field started pre-filled via initialApplicationNumber.
  it("clears the input and calls onSearch with an empty object", async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearch({ initialApplicationNumber: "INC-1" });

    await user.click(screen.getByRole("button", { name: "Clear Search" }));

    expect(screen.getByLabelText("Ticket No.")).toHaveValue("");
    expect(onSearch).toHaveBeenCalledWith({});
  });
});
