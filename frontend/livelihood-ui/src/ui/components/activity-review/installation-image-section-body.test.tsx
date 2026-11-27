import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InstallationImageSectionBody } from "./installation-image-section-body";
import type { ImageChecklistSectionContent } from "./types";

function makeSection(overrides: Partial<ImageChecklistSectionContent> = {}): ImageChecklistSectionContent {
  return {
    kind: "IMAGE_CHECKLIST",
    id: "SITE_OVERVIEW",
    label: "Site overview photo",
    images: [],
    ...overrides,
  };
}

describe("InstallationImageSectionBody", () => {
  it("shows the capture hint and the optional note above the images", () => {
    render(
      <InstallationImageSectionBody
        section={makeSection({
          hint: "RMS site photo with geotagging.",
          optional: true,
          images: [{ url: "https://example.com/1.jpg" }],
        })}
      />,
    );
    expect(screen.getByText(/RMS site photo with geotagging\./)).toBeInTheDocument();
    expect(screen.getByText("(Optional photo)")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows the hint even when no photo was uploaded", () => {
    render(<InstallationImageSectionBody section={makeSection({ hint: "Clear image of AJB." })} />);
    expect(screen.getByText("Clear image of AJB.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders nothing when the section has no images and no hint", () => {
    const { container } = render(<InstallationImageSectionBody section={makeSection()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one image link per section image, with no title box", () => {
    render(
      <InstallationImageSectionBody
        section={makeSection({
          images: [{ url: "https://example.com/1.jpg" }, { url: "https://example.com/2.jpg" }],
        })}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://example.com/1.jpg");
    expect(links[1]).toHaveAttribute("href", "https://example.com/2.jpg");
  });
});
