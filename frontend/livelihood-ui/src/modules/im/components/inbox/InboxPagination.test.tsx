/**
 * Unit tests for InboxPagination.
 *
 * InboxPagination is a presentational component that derives all of its state
 * (total page count, whether Previous/Next are enabled, which page buttons to
 * render) from its props — it holds no internal state and calls back to the
 * parent (onPageChange/onNextPage/onPrevPage/onPageSizeChange) for every
 * interaction. These tests exercise it purely through rendered DOM and
 * simulated user interaction rather than mocking, since there is no external
 * dependency to stub out beyond translation.
 *
 * The component calls `useTranslate`/`translateOr` for its labels, so every
 * test wraps the component in a real `I18nextProvider` backed by an isolated
 * i18next instance with empty translation resources. Because the resources
 * are empty, `translateOr` always falls back to the English default strings
 * passed as its third argument (e.g. "Previous", "Next", "Items per Page"),
 * which is what the assertions below match against.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { InboxPagination } from "./InboxPagination";

// Builds a fresh, isolated i18next instance per test with no translation
// resources loaded, so translateOr(...) deterministically falls back to the
// English default text baked into InboxPagination.
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

// Renders InboxPagination with sensible defaults (25 records / page size 10
// => 3 pages, starting on page 0) so each test only needs to override the
// props it actually cares about.
function renderPagination(props: Partial<ComponentProps<typeof InboxPagination>> = {}) {
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <InboxPagination
        currentPage={0}
        totalRecords={25}
        pageSizeLimit={10}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        {...props}
      />
    </I18nextProvider>,
  );
}

// InboxPagination (src/modules/im/components/inbox/InboxPagination.tsx)
// renders a page-size selector plus Previous/page-number/Next controls. It
// derives everything from props: totalPages = max(1, ceil(totalRecords /
// pageSizeLimit)); Previous is enabled only when currentPage > 0; Next is
// enabled only when (currentPage + 1) * pageSizeLimit < totalRecords; and one
// numbered button (1-indexed label, 0-indexed value) is rendered per computed
// page, with the button matching `currentPage` visually highlighted. All user
// interactions are forwarded verbatim to the corresponding callback prop
// (onPageChange/onNextPage/onPrevPage/onPageSizeChange) — the component
// itself never mutates currentPage/pageSizeLimit.
describe("InboxPagination", () => {
  // totalRecords=25, pageSizeLimit=10 => ceil(25/10) = 3 pages, so exactly
  // buttons "1".."3" should exist and no "4" button should be rendered.
  it("renders one page button per computed page (ceil(total/pageSize))", () => {
    renderPagination({ totalRecords: 25, pageSizeLimit: 10 });
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "4" })).not.toBeInTheDocument();
  });

  // totalPages uses Math.max(1, ...) so an empty inbox (totalRecords = 0)
  // still renders a single "1" page button instead of zero buttons.
  it("shows at least 1 page even when totalRecords is 0", () => {
    renderPagination({ totalRecords: 0, pageSizeLimit: 10 });
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
  });

  // canGoPrev is `currentPage > 0`, so page index 0 (the first page) must
  // leave Previous disabled.
  it("disables Previous on the first page", () => {
    renderPagination({ currentPage: 0 });
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });

  it("enables Previous once past the first page", () => {
    renderPagination({ currentPage: 1 });
    expect(screen.getByRole("button", { name: /previous/i })).not.toBeDisabled();
  });

  // canGoNext is `(currentPage + 1) * pageSizeLimit < totalRecords`; page
  // index 2 with pageSizeLimit 10 covers records 20-29, which already
  // exceeds totalRecords=25, so Next must be disabled on this last page.
  it("disables Next on the last page", () => {
    renderPagination({ currentPage: 2, totalRecords: 25, pageSizeLimit: 10 });
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("enables Next when more records remain", () => {
    renderPagination({ currentPage: 0, totalRecords: 25, pageSizeLimit: 10 });
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
  });

  // Page buttons are 1-indexed labels but pass the 0-indexed page value to
  // onPageChange, so clicking the button labeled "2" must call back with 1.
  it("calls onPageChange with the clicked page index", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderPagination({ onPageChange });

    await user.click(screen.getByRole("button", { name: "2" }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  // currentPage=1 keeps both Previous (currentPage > 0) and Next
  // ((currentPage+1)*10=20 < 25) enabled so both clicks can register.
  it("calls onNextPage/onPrevPage when those buttons are clicked", async () => {
    const user = userEvent.setup();
    const onNextPage = vi.fn();
    const onPrevPage = vi.fn();
    renderPagination({ currentPage: 1, onNextPage, onPrevPage });

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /previous/i }));

    expect(onNextPage).toHaveBeenCalledTimes(1);
    expect(onPrevPage).toHaveBeenCalledTimes(1);
  });

  // The <select> onChange handler coerces event.target.value (a string)
  // via Number(...) before calling onPageSizeChange, so this must be called
  // with the numeric 20, not the string "20".
  it("calls onPageSizeChange with the numeric selected value", async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    renderPagination({ onPageSizeChange });

    await user.selectOptions(screen.getByRole("combobox"), "20");

    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });

  // The `cn(...)` class-merging logic applies "bg-primary-700" only to the
  // button whose 0-indexed page value equals `currentPage`; button "2"
  // corresponds to page index 1.
  it("highlights the current page button", () => {
    renderPagination({ currentPage: 1 });
    expect(screen.getByRole("button", { name: "2" })).toHaveClass("bg-primary-700");
  });
});
