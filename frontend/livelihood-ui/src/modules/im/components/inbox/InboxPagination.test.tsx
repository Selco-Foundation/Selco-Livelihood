import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { InboxPagination } from "./InboxPagination";

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

describe("InboxPagination", () => {
  it("renders one page button per computed page (ceil(total/pageSize))", () => {
    renderPagination({ totalRecords: 25, pageSizeLimit: 10 });
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "4" })).not.toBeInTheDocument();
  });

  it("shows at least 1 page even when totalRecords is 0", () => {
    renderPagination({ totalRecords: 0, pageSizeLimit: 10 });
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
  });

  it("disables Previous on the first page", () => {
    renderPagination({ currentPage: 0 });
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });

  it("enables Previous once past the first page", () => {
    renderPagination({ currentPage: 1 });
    expect(screen.getByRole("button", { name: /previous/i })).not.toBeDisabled();
  });

  it("disables Next on the last page", () => {
    renderPagination({ currentPage: 2, totalRecords: 25, pageSizeLimit: 10 });
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("enables Next when more records remain", () => {
    renderPagination({ currentPage: 0, totalRecords: 25, pageSizeLimit: 10 });
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
  });

  it("calls onPageChange with the clicked page index", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderPagination({ onPageChange });

    await user.click(screen.getByRole("button", { name: "2" }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

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

  it("calls onPageSizeChange with the numeric selected value", async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();
    renderPagination({ onPageSizeChange });

    await user.selectOptions(screen.getByRole("combobox"), "20");

    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });

  it("highlights the current page button", () => {
    renderPagination({ currentPage: 1 });
    expect(screen.getByRole("button", { name: "2" })).toHaveClass("bg-primary-700");
  });
});
