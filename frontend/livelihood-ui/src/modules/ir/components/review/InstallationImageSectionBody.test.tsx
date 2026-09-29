import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ImageChecklistSectionContent } from "../../types/activity-review";
import { InstallationImageSectionBody } from "./InstallationImageSectionBody";

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
  it("renders nothing when the section has no images", () => {
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
