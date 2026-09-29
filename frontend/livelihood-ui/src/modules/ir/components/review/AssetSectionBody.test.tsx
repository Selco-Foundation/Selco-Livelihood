import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AssetSectionContent } from "../../types/activity-review";
import { AssetSectionBody } from "./AssetSectionBody";

function makeSection(overrides: Partial<AssetSectionContent> = {}): AssetSectionContent {
  return {
    kind: "ASSET",
    id: "PANEL",
    labelKey: "ES_IR_PANEL",
    label: "Panel",
    specifications: [],
    images: [],
    videos: [],
    ...overrides,
  };
}

describe("AssetSectionBody", () => {
  it("renders no asset-count box when count is undefined", () => {
    render(<AssetSectionBody section={makeSection()} />);
    expect(screen.queryByText("Asset Count")).not.toBeInTheDocument();
  });

  it("renders the asset-count box with the section's label and count when count is set", () => {
    render(<AssetSectionBody section={makeSection({ count: 4 })} />);
    expect(screen.getByText("Asset Count")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders the default Specifications heading and its rows", () => {
    render(
      <AssetSectionBody
        section={makeSection({
          specifications: [{ labelKey: "ES_IR_SPEC_CAPACITY", label: "Capacity", value: "5kW" }],
        })}
      />,
    );
    expect(screen.getByText("Specifications")).toBeInTheDocument();
    expect(screen.getByText("Capacity")).toBeInTheDocument();
    expect(screen.getByText("5kW")).toBeInTheDocument();
  });

  it("uses the overridden specifications heading when specificationsHeading is set", () => {
    render(
      <AssetSectionBody
        section={makeSection({
          specifications: [{ labelKey: "ES_IR_VENDOR", label: "Vendor", value: "Acme" }],
          specificationsHeading: { labelKey: "ES_IR_INSTALLATION_DETAILS", label: "Installation Details" },
        })}
      />,
    );
    expect(screen.getByText("Installation Details")).toBeInTheDocument();
    expect(screen.queryByText("Specifications")).not.toBeInTheDocument();
  });

  it("renders the extraSpecifications box with its own title and fields when present", () => {
    render(
      <AssetSectionBody
        section={makeSection({
          extraSpecifications: {
            labelKey: "ES_IR_CAPACITY_VOLTAGE",
            label: "Capacity & Voltage",
            fields: [{ labelKey: "ES_IR_VOLTAGE", label: "Voltage", value: "12V" }],
          },
        })}
      />,
    );
    expect(screen.getByText("Capacity & Voltage")).toBeInTheDocument();
    expect(screen.getByText("Voltage")).toBeInTheDocument();
    expect(screen.getByText("12V")).toBeInTheDocument();
  });

  it("renders no extraSpecifications box when absent", () => {
    render(<AssetSectionBody section={makeSection()} />);
    expect(screen.queryByText("Capacity & Voltage")).not.toBeInTheDocument();
  });

  it("renders the Details box when details is present", () => {
    render(
      <AssetSectionBody
        section={makeSection({
          details: [{ labelKey: "ES_IR_SERIAL_NUMBER", label: "Serial Number", value: "SN-1" }],
        })}
      />,
    );
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("SN-1")).toBeInTheDocument();
  });

  describe("items", () => {
    it("hides an item with no serial/capacity/quantity and no images", () => {
      render(
        <AssetSectionBody
          section={makeSection({
            items: [{ itemNumber: 1, images: [] }],
          })}
        />,
      );
      expect(screen.queryByText("Panel 1")).not.toBeInTheDocument();
    });

    it("shows an item with its own fields, defaulting the heading to '{section label} {itemNumber}'", () => {
      render(
        <AssetSectionBody
          section={makeSection({
            items: [{ itemNumber: 1, serialNumber: "SN-1", capacity: "5kW", quantity: 2, images: [] }],
          })}
        />,
      );
      expect(screen.getByText("Panel 1")).toBeInTheDocument();
      expect(screen.getByText("Serial Number")).toBeInTheDocument();
      expect(screen.getByText("SN-1")).toBeInTheDocument();
      expect(screen.getByText("Capacity")).toBeInTheDocument();
      expect(screen.getByText("5kW")).toBeInTheDocument();
      expect(screen.getByText("Quantity")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("uses the item's own label to override the default heading when set", () => {
      render(
        <AssetSectionBody
          section={makeSection({
            id: "MACHINE",
            labelKey: "ES_IR_MACHINE",
            label: "Machine",
            items: [{ itemNumber: 1, label: "Motor Assembly", serialNumber: "SN-5", images: [] }],
          })}
        />,
      );
      expect(screen.getByText("Motor Assembly")).toBeInTheDocument();
      expect(screen.queryByText("Machine 1")).not.toBeInTheDocument();
    });

    it("shows an item that has only images, with no own fields", () => {
      render(
        <AssetSectionBody
          section={makeSection({
            items: [{ itemNumber: 1, images: [{ url: "https://example.com/item.jpg" }] }],
          })}
        />,
      );
      expect(screen.getByText("Panel 1")).toBeInTheDocument();
      expect(screen.getByText("Image")).toBeInTheDocument();
    });

    it("filters out only the items that carry no information, keeping the rest", () => {
      render(
        <AssetSectionBody
          section={makeSection({
            items: [
              { itemNumber: 1, images: [] },
              { itemNumber: 2, serialNumber: "SN-2", images: [] },
            ],
          })}
        />,
      );
      expect(screen.queryByText("Panel 1")).not.toBeInTheDocument();
      expect(screen.getByText("Panel 2")).toBeInTheDocument();
    });
  });

  it("renders the section's own Images grid when images is non-empty", () => {
    render(
      <AssetSectionBody section={makeSection({ images: [{ url: "https://example.com/section.jpg" }] })} />,
    );
    expect(screen.getByText("Images")).toBeInTheDocument();
  });

  it("renders the section's own Videos list when videos is non-empty", () => {
    render(
      <AssetSectionBody section={makeSection({ videos: [{ url: "https://example.com/section.mp4" }] })} />,
    );
    expect(screen.getByText("Videos")).toBeInTheDocument();
  });

  it("renders each media group with its own label, images, and videos", () => {
    render(
      <AssetSectionBody
        section={makeSection({
          mediaGroups: [
            {
              id: "electric-board",
              labelKey: "ES_IR_ELECTRIC_BOARD",
              label: "Electric Board",
              images: [{ url: "https://example.com/board.jpg" }],
              videos: [{ url: "https://example.com/board.mp4" }],
            },
          ],
        })}
      />,
    );
    expect(screen.getAllByText("Electric Board")).toHaveLength(2);
  });
});
