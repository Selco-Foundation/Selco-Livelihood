import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComplaintMediaSection } from "./ComplaintMediaSection";

describe("ComplaintMediaSection", () => {
  it("renders nothing when there are no images and no videos", () => {
    const { container } = render(<ComplaintMediaSection images={[]} videos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the Attachments heading and the media when images are present", () => {
    render(<ComplaintMediaSection images={["https://example.com/a.jpg"]} videos={[]} />);

    expect(screen.getByText("Attachments")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Attachment 1" })).toBeInTheDocument();
  });

  it("renders the Attachments heading and the media when videos are present", () => {
    render(
      <ComplaintMediaSection images={[]} videos={[{ original: "https://example.com/clip.mp4" }]} />,
    );

    expect(screen.getByText("Attachments")).toBeInTheDocument();
    expect(document.querySelector("video")).toBeInTheDocument();
  });
});
