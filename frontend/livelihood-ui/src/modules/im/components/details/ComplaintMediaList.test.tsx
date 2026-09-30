import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComplaintMediaList, type ComplaintVideoEntry } from "./ComplaintMediaList";

describe("ComplaintMediaList", () => {
  it("renders nothing when there are no images and no videos", () => {
    const { container } = render(<ComplaintMediaList images={[]} videos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an image link for an image attachment", () => {
    render(<ComplaintMediaList images={["https://example.com/photo.jpg"]} videos={[]} />);

    const link = screen.getByRole("link", { name: "Attachment 1" });
    expect(link).toHaveAttribute("href", "https://example.com/photo.jpg");
    expect(link.querySelector("img")).toHaveAttribute("src", "https://example.com/photo.jpg");
  });

  it("renders a PDF icon and file name for a pdf attachment", () => {
    const { container } = render(
      <ComplaintMediaList images={["https://example.com/docs/report.pdf"]} videos={[]} />,
    );

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(container.querySelector(".lucide-file-text")).toBeInTheDocument();
  });

  it("renders a generic document icon for a non-pdf, non-image attachment", () => {
    const { container } = render(
      <ComplaintMediaList images={["https://example.com/docs/quote.docx"]} videos={[]} />,
    );

    expect(screen.getByText("quote.docx")).toBeInTheDocument();
    expect(screen.getByText("DOCX")).toBeInTheDocument();
    expect(container.querySelector(".lucide-file")).toBeInTheDocument();
    expect(container.querySelector(".lucide-file-text")).not.toBeInTheDocument();
  });

  it("applies a custom imageGridClassName to the image grid", () => {
    const { container } = render(
      <ComplaintMediaList
        images={["https://example.com/a.png"]}
        videos={[]}
        imageGridClassName="grid grid-cols-9"
      />,
    );

    expect(container.querySelector(".grid-cols-9")).toBeInTheDocument();
  });

  it("renders a playable video element when the video has an original url", () => {
    const videos: ComplaintVideoEntry[] = [{ original: "https://example.com/clip.mp4" }];
    const { container } = render(<ComplaintMediaList images={[]} videos={videos} />);

    const video = container.querySelector("video");
    expect(video).toHaveAttribute("src", "https://example.com/clip.mp4");
  });

  it("renders a View video link when only a master url is present", () => {
    const videos: ComplaintVideoEntry[] = [{ master: "https://example.com/master.m3u8" }];
    render(<ComplaintMediaList images={[]} videos={videos} />);

    expect(screen.getByRole("link", { name: "View video" })).toHaveAttribute(
      "href",
      "https://example.com/master.m3u8",
    );
  });

  it("renders nothing for a video entry with neither an original nor a master url", () => {
    const videos: ComplaintVideoEntry[] = [{}];
    const { container } = render(<ComplaintMediaList images={[]} videos={videos} />);

    expect(container.querySelector("video")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View video" })).not.toBeInTheDocument();
  });
});
