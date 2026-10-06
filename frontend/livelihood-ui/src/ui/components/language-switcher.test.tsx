import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupportedLanguage } from "@/shared";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, useLanguages: vi.fn(), setLocale: vi.fn() };
});

import { setLocale, useLanguages, useLocaleStore } from "@/shared";
import { toast } from "sonner";
import { LanguageSwitcher } from "./language-switcher";

const mockUseLanguages = vi.mocked(useLanguages);
const mockSetLocale = vi.mocked(setLocale);

const languages: SupportedLanguage[] = [
  { code: "en_IN", label: "English", nativeLabel: "English" },
  { code: "hi_IN", label: "Hindi", nativeLabel: "हिंदी" },
];

beforeEach(() => {
  mockUseLanguages.mockReturnValue(languages);
  mockSetLocale.mockReset();
  useLocaleStore.setState({ locale: "en_IN" });
});

describe("LanguageSwitcher", () => {
  it("shows the current locale's native label on the trigger", () => {
    render(<LanguageSwitcher />);

    expect(screen.getByRole("button", { name: /English/ })).toBeInTheDocument();
  });

  it("lists every language as a menu item when opened", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button", { name: /English/ }));

    expect(screen.getByRole("menuitem", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "हिंदी" })).toBeInTheDocument();
  });

  it("calls setLocale with the clicked language's code", async () => {
    const user = userEvent.setup();
    mockSetLocale.mockResolvedValue(undefined);
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button", { name: /English/ }));
    await user.click(screen.getByRole("menuitem", { name: "हिंदी" }));

    expect(mockSetLocale).toHaveBeenCalledWith("hi_IN");
  });

  it("does not call setLocale when the already-active language is clicked", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button", { name: /English/ }));
    await user.click(screen.getByRole("menuitem", { name: "English" }));

    expect(mockSetLocale).not.toHaveBeenCalled();
  });

  it("renders a compact icon-only trigger with the native label as its aria-label", () => {
    render(<LanguageSwitcher compact />);

    const button = screen.getByRole("button", { name: "English" });
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveTextContent("English");
  });

  it("shows an error toast with the error's message when setLocale rejects", async () => {
    const user = userEvent.setup();
    mockSetLocale.mockRejectedValue(new Error("network down"));
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button", { name: /English/ }));
    await user.click(screen.getByRole("menuitem", { name: "हिंदी" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to change language", {
        description: "network down",
      }),
    );
  });

  it("falls back to a generic description when the rejection isn't an Error instance", async () => {
    const user = userEvent.setup();
    mockSetLocale.mockRejectedValue("boom");
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button", { name: /English/ }));
    await user.click(screen.getByRole("menuitem", { name: "हिंदी" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to change language", {
        description: "Please try again.",
      }),
    );
  });
});
