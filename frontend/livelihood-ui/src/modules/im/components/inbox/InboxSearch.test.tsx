import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { InboxSearch } from "./InboxSearch";

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

function renderSearch(props: Partial<ComponentProps<typeof InboxSearch>> = {}) {
  const onSearch = vi.fn();
  render(
    <I18nextProvider i18n={createTestI18n()}>
      <InboxSearch onSearch={onSearch} {...props} />
    </I18nextProvider>,
  );
  return { onSearch };
}

describe("InboxSearch", () => {
  it("prefills the input with initialApplicationNumber", () => {
    renderSearch({ initialApplicationNumber: "INC-1" });
    expect(screen.getByLabelText("Ticket No.")).toHaveValue("INC-1");
  });

  it("submits with the trimmed applicationNumber when the input has a value", async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearch();

    await user.type(screen.getByLabelText("Ticket No."), "  INC-1  ");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith({ applicationNumber: "INC-1" });
  });

  it("submits an empty object when the input is blank", async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearch();

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith({});
  });

  it("clears the input and calls onSearch with an empty object", async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearch({ initialApplicationNumber: "INC-1" });

    await user.click(screen.getByRole("button", { name: "Clear Search" }));

    expect(screen.getByLabelText("Ticket No.")).toHaveValue("");
    expect(onSearch).toHaveBeenCalledWith({});
  });
});
