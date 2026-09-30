import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LoginBannerImage } from "@/shared";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, useLoginBannerImages: vi.fn() };
});

vi.mock("@/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui")>();
  return { ...actual, LanguageSwitcher: () => <div>Language Switcher Stub</div> };
});

import { useLoginBannerImages } from "@/shared";
import { AuthLayout } from "./AuthLayout";

const mockUseLoginBannerImages = vi.mocked(useLoginBannerImages);

afterEach(() => {
  window.globalConfigs = { getConfig: () => undefined };
});

describe("AuthLayout", () => {
  it("renders the title, subtitle and children", () => {
    mockUseLoginBannerImages.mockReturnValue([]);
    render(
      <AuthLayout title="Welcome back" subtitle="Please sign in to continue">
        <div>Child Content</div>
      </AuthLayout>,
    );

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Please sign in to continue")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("renders both logo images with the fallback alt text when no translation exists", () => {
    mockUseLoginBannerImages.mockReturnValue([]);
    render(
      <AuthLayout title="Welcome back" subtitle="Please sign in">
        <div>Child</div>
      </AuthLayout>,
    );

    expect(screen.getAllByAltText("Livelihood Logo")).toHaveLength(2);
  });

  it("renders the logo image using the configured LOGO_COLORED value", () => {
    window.globalConfigs = {
      getConfig: (key: string) => (key === "LOGO_COLORED" ? "https://example.com/logo.png" : undefined),
    };
    mockUseLoginBannerImages.mockReturnValue([]);
    render(
      <AuthLayout title="Welcome back" subtitle="Please sign in">
        <div>Child</div>
      </AuthLayout>,
    );

    const logos = screen.getAllByAltText("Livelihood Logo");
    logos.forEach((logo) => {
      expect(logo).toHaveAttribute("src", "https://example.com/logo.png");
    });
  });

  it("passes the banner images returned by useLoginBannerImages down to the carousel", () => {
    const slides: LoginBannerImage[] = [
      { image: "https://example.com/slide1.png", title: "Slide title", discription: "Slide One" },
    ];
    mockUseLoginBannerImages.mockReturnValue(slides);
    render(
      <AuthLayout title="Welcome back" subtitle="Please sign in">
        <div>Child</div>
      </AuthLayout>,
    );

    expect(screen.getByAltText("Slide One")).toHaveAttribute("src", "https://example.com/slide1.png");
  });

  it("renders the language switcher in both the mobile and desktop layouts", () => {
    mockUseLoginBannerImages.mockReturnValue([]);
    render(
      <AuthLayout title="Welcome back" subtitle="Please sign in">
        <div>Child</div>
      </AuthLayout>,
    );

    expect(screen.getAllByText("Language Switcher Stub")).toHaveLength(2);
  });
});
