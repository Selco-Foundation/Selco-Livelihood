/**
 * Unit tests for `AuthLayout` (src/modules/core/components/AuthLayout.tsx).
 *
 * AuthLayout is the shared shell for the employee auth screens (login,
 * forgot-password, change-password). It has three pieces of runtime logic
 * worth exercising directly (everything else is pure JSX layout):
 *
 *  - Logo resolution: it reads `LOGO_LIST` from the runtime `getConfig`
 *    (backed by `window.globalConfigs.getConfig`) and uses the first entry's
 *    `url`/`alt` for both the desktop and mobile `<img>` tags. When no logo
 *    is configured, `src` is left `undefined` and the `alt` text falls back
 *    to `translateOr(t, "CORE_LOGO_ALT", "Selco Foundation Logo")` — i.e. the
 *    translated string wins over the hard-coded fallback only when the i18n
 *    instance actually has a `CORE_LOGO_ALT` key.
 *  - Banner image wiring: it calls `useLoginBannerImages()` (a react-query
 *    hook backed by `fetchLoginBannerImages`) and forwards whatever it
 *    returns, untouched, as the `slides` prop of `LoginCarousel`.
 *  - Passthrough content: `title`, `subtitle`, and `children` are rendered
 *    verbatim into the layout.
 *
 * Testing approach:
 *  - No router wrapper — AuthLayout does not read route state and none of
 *    its children (`LanguageSwitcher`, `LoginCarousel`) navigate.
 *  - A real `QueryClientProvider` is used (retries disabled) because the
 *    child components' data hooks (`useLoginBannerImages`, `useLanguages`)
 *    call `useQuery` internally; mocking those hooks directly would violate
 *    the "mock at the API layer" convention, so instead we
 *    `vi.spyOn(mdmsApi, "fetchLoginBannerImages")` per the pattern already
 *    used by `ForgotPasswordPage.test.tsx`. `fetchLanguages` is deliberately
 *    left unmocked: with retries off it rejects immediately in jsdom and
 *    `useLanguages` synchronously falls back to its built-in English
 *    default, so `LanguageSwitcher` renders without extra setup (same as
 *    other suites in this directory).
 *  - A lightweight, network-free i18next instance is created per test (see
 *    `render-with-providers.tsx` / sibling `*.test.tsx` files for the same
 *    pattern) so translation-fallback behavior can be asserted precisely by
 *    supplying (or omitting) a `CORE_LOGO_ALT` resource.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as mdmsApi from "@/shared/api/mdms";
import type { LoginBannerImage } from "@/shared";
import { AuthLayout } from "./AuthLayout";

function createTestI18n(resources: Record<string, string> = {}) {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: { en_IN: { translations: resources } },
    react: { useSuspense: false },
  });
  return instance;
}

function renderAuthLayout(
  { title = "Welcome back", subtitle = "Sign in to continue", children = <div>Form goes here</div> } = {},
  i18nResources: Record<string, string> = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={createTestI18n(i18nResources)}>
      <QueryClientProvider client={queryClient}>
        <AuthLayout title={title} subtitle={subtitle}>
          {children}
        </AuthLayout>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

function buildBannerSlide(n: number): LoginBannerImage {
  return { image: `https://cdn/banner${n}.jpg`, title: `Banner ${n}`, discription: `Banner ${n} description` };
}

afterEach(() => {
  vi.restoreAllMocks();
  // Restore the default stub installed in src/test/setup.ts so `LOGO_LIST`
  // resolution tests don't leak a configured logo into later tests.
  window.globalConfigs = { getConfig: () => undefined };
});

describe("AuthLayout", () => {
  // Logo resolution: `logos?.[0]` comes from `getConfig("LOGO_LIST")`, and
  // `logoAlt` is `logo?.alt ?? translateOr(t, "CORE_LOGO_ALT", fallback)`.
  // These tests drive `window.globalConfigs.getConfig` (the runtime source
  // `getConfig` reads from) and the i18n resource bundle to cover both
  // branches of that fallback chain.
  describe("logo resolution", () => {
    it("renders logo images with no src and the hard-coded alt fallback when LOGO_LIST is not configured", () => {
      // Default test setup already stubs getConfig to return undefined for
      // every key (see src/test/setup.ts), and no CORE_LOGO_ALT resource is
      // supplied, so translateOr must fall through to its literal fallback.
      renderAuthLayout();

      const logos = screen.getAllByAltText("Selco Foundation Logo");
      expect(logos).toHaveLength(2); // desktop header logo + mobile logo
      logos.forEach((logo) => expect(logo).not.toHaveAttribute("src"));
    });

    it("uses the translated CORE_LOGO_ALT string when it is present in the i18n bundle and no logo is configured", () => {
      // logo is undefined here, so logoAlt must resolve via translateOr,
      // and translateOr only returns the translated value (not the literal
      // fallback) when t(key) !== key, i.e. the resource key exists.
      renderAuthLayout({}, { CORE_LOGO_ALT: "Foundation Logo (translated)" });

      expect(screen.getAllByAltText("Foundation Logo (translated)")).toHaveLength(2);
    });

    it("uses the configured logo's url and alt, ignoring the translated fallback entirely", () => {
      // logo?.alt is present, so the `??` short-circuits before translateOr
      // is even consulted — a CORE_LOGO_ALT resource is supplied here
      // specifically to prove it is NOT what ends up on screen.
      window.globalConfigs = {
        getConfig: (key: string) =>
          key === "LOGO_LIST" ? [{ url: "https://cdn/logo.png", alt: "Configured Logo" }] : undefined,
      };

      renderAuthLayout({}, { CORE_LOGO_ALT: "Should not be used" });

      const logos = screen.getAllByAltText("Configured Logo");
      expect(logos).toHaveLength(2);
      logos.forEach((logo) => expect(logo).toHaveAttribute("src", "https://cdn/logo.png"));
      expect(screen.queryByAltText("Should not be used")).not.toBeInTheDocument();
    });
  });

  // Banner image wiring: AuthLayout renders `<LoginCarousel slides={bannerImages} />`
  // where bannerImages comes straight from `useLoginBannerImages()`, which in
  // turn wraps `fetchLoginBannerImages` in a react-query call. LoginCarousel
  // itself renders an empty-state icon when `slides` is empty, or an <img>
  // per active slide (using `discription` as its alt text) otherwise — so
  // asserting on that rendered output is how we confirm the data actually
  // reached the carousel unmodified.
  describe("banner image wiring", () => {
    it("renders the carousel's empty-state icon when fetchLoginBannerImages resolves with no images", async () => {
      vi.spyOn(mdmsApi, "fetchLoginBannerImages").mockResolvedValue([]);

      renderAuthLayout();

      // LoginCarousel renders a lucide ImageIcon <svg> (no accessible name)
      // as its empty state; wait for the query to settle before asserting.
      expect(await screen.findByText("Welcome back")).toBeInTheDocument();
      expect(document.querySelector("svg")).toBeInTheDocument();
    });

    it("forwards the resolved banner images to LoginCarousel as slides", async () => {
      // Two slides so LoginCarousel also renders its navigation controls,
      // confirming `slideCount` was derived from the real array length.
      vi.spyOn(mdmsApi, "fetchLoginBannerImages").mockResolvedValue([
        buildBannerSlide(1),
        buildBannerSlide(2),
      ]);

      renderAuthLayout();

      expect(await screen.findByAltText("Banner 1 description")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument();
    });
  });

  // Passthrough content: title/subtitle/children are rendered verbatim with
  // no transformation, so this just confirms the wiring didn't drop or
  // mis-order any of the three.
  describe("static content", () => {
    it("renders the given title, subtitle, and children", () => {
      renderAuthLayout({
        title: "Reset your password",
        subtitle: "Enter your mobile number to receive an OTP",
        children: <button type="button">Send OTP</button>,
      });

      expect(screen.getByText("Reset your password")).toBeInTheDocument();
      expect(screen.getByText("Enter your mobile number to receive an OTP")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Send OTP" })).toBeInTheDocument();
    });
  });
});
