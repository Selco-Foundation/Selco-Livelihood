/**
 * Unit tests for LoginCarousel.
 *
 * LoginCarousel is a self-contained image carousel used on the login screen. It renders
 * an empty-state icon when given no slides, a single static slide with no controls when
 * given exactly one, and full navigation (prev/next arrows + dot indicators) plus a
 * 7-second auto-advance timer when given more than one. It also caps the number of
 * visible dots (MAX_VISIBLE_DOTS = 4) and derives which dots to show around the active
 * index, wrapping index math for prev/next, and applies aria-labels via translateOr so
 * they still read sensibly when a translation key is missing.
 *
 * Testing approach:
 * - The component only depends on `useTranslate`/`translateOr` from "@/shared" for
 *   accessible labels, so rather than mocking that hook we wrap renders in a real
 *   I18nextProvider backed by an isolated i18next instance with empty translation
 *   resources (see createTestI18n/renderCarousel). This exercises the real translateOr
 *   fallback path (missing keys resolve to their English defaults, e.g. "Next slide"),
 *   which is what the aria-label assertions below match against.
 * - Vitest fake timers are enabled for every test (see beforeEach/afterEach) because the
 *   component starts a `setInterval` auto-advance timer as soon as it mounts (when there
 *   is more than one slide). Fake timers let tests deterministically fast-forward that
 *   timer instead of waiting on a real 7-second interval, and `userEvent.setup({
 *   advanceTimers: vi.advanceTimersByTime })` is used so simulated user clicks still
 *   advance fake time correctly.
 * - No mocking of the carousel itself or of image loading is needed: images are rendered
 *   as plain <img> elements identified by their alt text, which is enough to assert which
 *   slide is currently showing.
 */
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoginBannerImage } from "@/shared";
import { LoginCarousel } from "./LoginCarousel";

// Builds a throwaway i18next instance with no real translation resources so that every
// aria-label rendered by LoginCarousel exercises the translateOr(...) fallback string
// (e.g. "Next slide", "Go to slide {SLIDE_NUMBER}") rather than a mocked value.
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

// LoginCarousel(slides): renders an ImageIcon placeholder with no controls when `slides`
// is empty; a single static <img> with no prev/next/dots when there's exactly one slide
// (since goToPrevious/goToNext would be no-ops and the auto-advance effect bails out for
// slideCount <= 1); and, for 2+ slides, prev/next buttons plus one dot per slide (pruned to
// MAX_VISIBLE_DOTS via getVisibleDotIndices) with a 7-second auto-advance timer. Navigation
// always wraps modulo slideCount, and each transition swaps the outgoing/active slide via
// activeIndex/direction state.
describe("LoginCarousel", () => {
  // With an empty `slides` array, activeSlide is undefined, so the component falls back to
  // the <ImageIcon> placeholder branch and the `slideCount > 1` guard suppresses the
  // prev/next/dot controls entirely.
  it("shows the empty-state icon and no controls when there are no slides", () => {
    renderCarousel([]);
    expect(document.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next slide/i })).not.toBeInTheDocument();
  });

  // The navigation controls (prev/next arrows, dots) and the auto-advance interval are both
  // gated on `slideCount > 1`, so a single slide should render its <img> but no controls at all.
  it("renders the single slide with no navigation controls when there's only one", () => {
    renderCarousel([buildSlide(1)]);
    expect(screen.getByAltText("Slide 1 description")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next slide/i })).not.toBeInTheDocument();
  });

  // getVisibleDotIndices returns every index unchanged when `count <= max`, so with 3 slides
  // (below MAX_VISIBLE_DOTS = 4) every slide should get its own "Go to slide N" dot button.
  it("renders one dot per slide when the count is within the visible-dot max", () => {
    renderCarousel([buildSlide(1), buildSlide(2), buildSlide(3)]);
    expect(screen.getByRole("button", { name: "Go to slide 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to slide 3" })).toBeInTheDocument();
  });

  // getVisibleDotIndices clamps the dot window to MAX_VISIBLE_DOTS (4) once there are more
  // slides than that, so with 10 slides only 4 "Go to slide N" buttons should ever render
  // (centered on the active index) rather than one per slide.
  it("caps the number of visible dots at the max even with many slides", () => {
    const slides = Array.from({ length: 10 }, (_, i) => buildSlide(i + 1));
    renderCarousel(slides);
    const dotButtons = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-label")?.startsWith("Go to slide"));
    expect(dotButtons).toHaveLength(4);
  });

  // Baseline case for goToNext's (activeIndex + 1) % slideCount step: clicking once from the
  // first of two slides should land on the second slide (the wrap-around case is covered
  // separately below).
  it("advances to the next slide when the next button is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCarousel([buildSlide(1), buildSlide(2)]);

    await user.click(screen.getByRole("button", { name: /next slide/i }));

    expect(screen.getByAltText("Slide 2 description")).toBeInTheDocument();
  });

  // goToPrevious computes (activeIndex - 1 + slideCount) % slideCount, so clicking
  // "previous" from index 0 must wrap around to the last slide instead of going negative.
  it("wraps to the last slide when going previous from the first slide", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCarousel([buildSlide(1), buildSlide(2), buildSlide(3)]);

    await user.click(screen.getByRole("button", { name: /previous slide/i }));

    expect(screen.getByAltText("Slide 3 description")).toBeInTheDocument();
  });

  // goToNext computes (activeIndex + 1) % slideCount, so advancing past the final slide
  // must wrap back around to index 0 rather than going out of bounds.
  it("wraps to the first slide when going next from the last slide", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCarousel([buildSlide(1), buildSlide(2)]);

    await user.click(screen.getByRole("button", { name: /next slide/i }));
    await user.click(screen.getByRole("button", { name: /next slide/i }));

    expect(screen.getByAltText("Slide 1 description")).toBeInTheDocument();
  });

  // goToSlide(index) transitions straight to the clicked dot's index (deriving direction
  // from whether it's ahead of or behind activeIndex) rather than stepping one at a time.
  it("jumps directly to a slide when its dot is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCarousel([buildSlide(1), buildSlide(2), buildSlide(3)]);

    await user.click(screen.getByRole("button", { name: "Go to slide 3" }));

    expect(screen.getByAltText("Slide 3 description")).toBeInTheDocument();
  });

  // The mount effect starts `setInterval(goToNext, 7000)` whenever slideCount > 1, so fast
  // -forwarding fake timers by exactly that interval should trigger one automatic advance.
  it("auto-advances to the next slide after the interval elapses", () => {
    renderCarousel([buildSlide(1), buildSlide(2)]);

    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(screen.getByAltText("Slide 2 description")).toBeInTheDocument();
  });

  // The auto-advance effect returns early (no interval is ever created) when
  // slideCount <= 1, so even fast-forwarding well past 7s must leave the single slide shown.
  it("does not auto-advance when there is only one slide", () => {
    renderCarousel([buildSlide(1)]);

    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(screen.getByAltText("Slide 1 description")).toBeInTheDocument();
  });
});
