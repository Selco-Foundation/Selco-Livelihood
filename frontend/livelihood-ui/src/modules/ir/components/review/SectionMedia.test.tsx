import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SectionImage, SectionVideo } from "../../types/activity-review";
import { SectionImageGrid, SectionVideoList } from "./SectionMedia";

describe("SectionImageGrid", () => {
  it("renders nothing when images is empty", () => {
    const { container } = render(<SectionImageGrid images={[]} title="Panel" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one link per image with an indexed accessible name and href", () => {
    const images: SectionImage[] = [{ url: "https://cdn.example.com/a.jpg" }, { url: "https://cdn.example.com/b.jpg" }];
    render(<SectionImageGrid images={images} title="Panel" />);

    const first = screen.getByRole("link", { name: "Image 1" });
    const second = screen.getByRole("link", { name: "Image 2" });
    expect(first).toHaveAttribute("href", "https://cdn.example.com/a.jpg");
    expect(second).toHaveAttribute("href", "https://cdn.example.com/b.jpg");
  });

  it("renders the title when provided and not bare", () => {
    render(<SectionImageGrid images={[{ url: "https://cdn.example.com/a.jpg" }]} title="Panel Photos" />);
    expect(screen.getByText("Panel Photos")).toBeInTheDocument();
  });

  it("still renders the images when bare, regardless of title", () => {
    render(<SectionImageGrid images={[{ url: "https://cdn.example.com/a.jpg" }]} title="Panel Photos" bare />);
    expect(screen.getByRole("link", { name: "Image 1" })).toBeInTheDocument();
    expect(screen.queryByText("Panel Photos")).not.toBeInTheDocument();
  });
});

describe("SectionVideoList", () => {
  it("renders nothing when videos is empty", () => {
    const { container } = render(<SectionVideoList videos={[]} title="Demo" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one video element and download link per entry with an indexed accessible name", () => {
    const videos: SectionVideo[] = [{ url: "https://cdn.example.com/a.mp4", size: 2 * 1024 * 1024 }];
    render(<SectionVideoList videos={videos} title="Demo" />);

    const downloadLink = screen.getByRole("link", { name: "Download video 1" });
    expect(downloadLink).toHaveAttribute("href", "https://cdn.example.com/a.mp4");
    expect(downloadLink).toHaveTextContent("2.0 MB");
  });

  it("renders an empty file-size label when size is not provided", () => {
    render(<SectionVideoList videos={[{ url: "https://cdn.example.com/a.mp4" }]} title="Demo" />);
    expect(screen.getByRole("link", { name: "Download video 1" })).toHaveTextContent("");
  });

  it("renders the title when provided and not bare", () => {
    render(<SectionVideoList videos={[{ url: "https://cdn.example.com/a.mp4" }]} title="Demo Videos" />);
    expect(screen.getByText("Demo Videos")).toBeInTheDocument();
  });

  it("omits the title text when bare", () => {
    render(<SectionVideoList videos={[{ url: "https://cdn.example.com/a.mp4" }]} title="Demo Videos" bare />);
    expect(screen.queryByText("Demo Videos")).not.toBeInTheDocument();
  });
});
