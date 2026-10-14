import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoginBannerImage } from "@/shared";
import { LoginCarousel } from "./LoginCarousel";

function slide(index: number): LoginBannerImage {
  return {
    image: `https://example.com/slide${index}.png`,
    title: `Slide title ${index}`,
    discription: `Slide ${index}`,
  };
}

describe("LoginCarousel", () => {
  it("renders a placeholder icon when there are no slides", () => {
    const { container } = render(<LoginCarousel slides={[]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the first slide's image by default", () => {
    render(<LoginCarousel slides={[slide(1), slide(2)]} />);
    expect(screen.getByAltText("Slide 1")).toHaveAttribute("src", "https://example.com/slide1.png");
  });

  it("does not render navigation controls when there is only one slide", () => {
    render(<LoginCarousel slides={[slide(1)]} />);
    expect(screen.queryByRole("button", { name: "Next slide" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous slide" })).not.toBeInTheDocument();
  });

  it("advances to the next slide when the next button is clicked", async () => {
    const user = userEvent.setup();
    render(<LoginCarousel slides={[slide(1), slide(2), slide(3)]} />);

    await user.click(screen.getByRole("button", { name: "Next slide" }));

    expect(screen.getByAltText("Slide 2")).toBeInTheDocument();
  });

  it("wraps around to the first slide after the last slide", async () => {
    const user = userEvent.setup();
    render(<LoginCarousel slides={[slide(1), slide(2), slide(3)]} />);

    await user.click(screen.getByRole("button", { name: "Next slide" }));
    await user.click(screen.getByRole("button", { name: "Next slide" }));
    await user.click(screen.getByRole("button", { name: "Next slide" }));

    expect(screen.getByAltText("Slide 1")).toBeInTheDocument();
  });

  it("wraps around to the last slide when going previous from the first slide", async () => {
    const user = userEvent.setup();
    render(<LoginCarousel slides={[slide(1), slide(2), slide(3)]} />);

    await user.click(screen.getByRole("button", { name: "Previous slide" }));

    expect(screen.getByAltText("Slide 3")).toBeInTheDocument();
  });

  it("jumps to a specific slide when its dot is clicked", async () => {
    const user = userEvent.setup();
    render(<LoginCarousel slides={[slide(1), slide(2), slide(3)]} />);

    await user.click(screen.getByRole("button", { name: "Go to slide 3" }));

    expect(screen.getByAltText("Slide 3")).toBeInTheDocument();
  });

  it("renders only up to 4 dots when there are more slides than that", () => {
    const slides = [slide(1), slide(2), slide(3), slide(4), slide(5), slide(6)];
    render(<LoginCarousel slides={slides} />);

    expect(screen.getAllByRole("button", { name: /Go to slide/ })).toHaveLength(4);
  });

  describe("auto-advance", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("advances to the next slide automatically after the interval elapses", () => {
      render(<LoginCarousel slides={[slide(1), slide(2)]} />);

      act(() => {
        vi.advanceTimersByTime(7000);
      });

      expect(screen.getByAltText("Slide 2")).toBeInTheDocument();
    });

    it("does not auto-advance when there is only one slide", () => {
      render(<LoginCarousel slides={[slide(1)]} />);

      act(() => {
        vi.advanceTimersByTime(20000);
      });

      expect(screen.getByAltText("Slide 1")).toBeInTheDocument();
    });
  });
});
