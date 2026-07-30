import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { PasswordChangedDialog } from "./PasswordChangedDialog";

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

describe("PasswordChangedDialog", () => {
  it("renders its content into document.body via a portal", () => {
    render(
      <I18nextProvider i18n={createTestI18n()}>
        <PasswordChangedDialog onConfirm={vi.fn()} />
      </I18nextProvider>,
    );

    expect(screen.getByText("Password updated successfully")).toBeInTheDocument();
    expect(document.body).toContainElement(screen.getByText("Password updated successfully"));
  });

  it("calls onConfirm when the OK button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <I18nextProvider i18n={createTestI18n()}>
        <PasswordChangedDialog onConfirm={onConfirm} />
      </I18nextProvider>,
    );

    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
