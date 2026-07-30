import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoginBannerImage } from "@/shared";
import { LoginCarousel } from "./LoginCarousel";

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

function renderCarousel(slides: LoginBannerImage[]) {
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <LoginCarousel slides={slides} />
    </I18nextProvider>,
  );
}

function buildSlide(n: number): LoginBannerImage {
  return { image: `https://cdn/slide${n}.jpg`, title: `Slide ${n}`, discription: `Slide ${n} description` };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LoginCarousel", () => {
  it("shows the empty-state icon and no controls when there are no slides", () => {
    renderCarousel([]);
    expect(document.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next slide/i })).not.toBeInTheDocument();
  });

  it("renders the single slide with no navigation controls when there's only one", () => {
    renderCarousel([buildSlide(1)]);
    expect(screen.getByAltText("Slide 1 description")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next slide/i })).not.toBeInTheDocument();
  });

  it("renders one dot per slide when the count is within the visible-dot max", () => {
    renderCarousel([buildSlide(1), buildSlide(2), buildSlide(3)]);
    expect(screen.getByRole("button", { name: "Go to slide 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to slide 3" })).toBeInTheDocument();
  });

  it("caps the number of visible dots at the max even with many slides", () => {
    const slides = Array.from({ length: 10 }, (_, i) => buildSlide(i + 1));
    renderCarousel(slides);
    const dotButtons = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-label")?.startsWith("Go to slide"));
    expect(dotButtons).toHaveLength(4);
  });

  it("advances to the next slide when the next button is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCarousel([buildSlide(1), buildSlide(2)]);

    await user.click(screen.getByRole("button", { name: /next slide/i }));

    expect(screen.getByAltText("Slide 2 description")).toBeInTheDocument();
  });

  it("wraps to the last slide when going previous from the first slide", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCarousel([buildSlide(1), buildSlide(2), buildSlide(3)]);

    await user.click(screen.getByRole("button", { name: /previous slide/i }));

    expect(screen.getByAltText("Slide 3 description")).toBeInTheDocument();
  });

  it("wraps to the first slide when going next from the last slide", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCarousel([buildSlide(1), buildSlide(2)]);

    await user.click(screen.getByRole("button", { name: /next slide/i }));
    await user.click(screen.getByRole("button", { name: /next slide/i }));

    expect(screen.getByAltText("Slide 1 description")).toBeInTheDocument();
  });

  it("jumps directly to a slide when its dot is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCarousel([buildSlide(1), buildSlide(2), buildSlide(3)]);

    await user.click(screen.getByRole("button", { name: "Go to slide 3" }));

    expect(screen.getByAltText("Slide 3 description")).toBeInTheDocument();
  });

  it("auto-advances to the next slide after the interval elapses", () => {
    renderCarousel([buildSlide(1), buildSlide(2)]);

    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(screen.getByAltText("Slide 2 description")).toBeInTheDocument();
  });

  it("does not auto-advance when there is only one slide", () => {
    renderCarousel([buildSlide(1)]);

    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(screen.getByAltText("Slide 1 description")).toBeInTheDocument();
  });
});
