import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EndUserAsset } from "../hooks/use-end-user-assets";
import { EndUserAssetsList } from "./EndUserAssetsList";

function asset(overrides: Partial<EndUserAsset> = {}): EndUserAsset {
  return {
    assetId: "a1",
    tenantId: "tenant-1",
    facilityId: "fac-1",
    boundaryCode: "B1",
    assetTypeId: "PANEL",
    name: "Solar Panel",
    ...overrides,
  };
}

describe("EndUserAssetsList", () => {
  it("always renders the section heading", () => {
    render(<EndUserAssetsList assets={[]} isLoading={false} />);

    expect(screen.getByText("My Registered Assets")).toBeInTheDocument();
  });

  it("shows the loading state and no assets", () => {
    render(<EndUserAssetsList assets={[asset()]} isLoading={true} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Solar Panel")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no assets and loading finished", () => {
    render(<EndUserAssetsList assets={[]} isLoading={false} />);

    expect(screen.getByText("No assets found")).toBeInTheDocument();
  });

  it("renders an asset's name, falling back to the asset's own name when no translation exists", () => {
    render(<EndUserAssetsList assets={[asset({ name: "Solar Panel" })]} isLoading={false} />);

    expect(screen.getByText("Solar Panel")).toBeInTheDocument();
  });

  it("prefers modelNumber over assetTypeId for the subtitle", () => {
    render(
      <EndUserAssetsList
        assets={[asset({ modelNumber: "MODEL-123", assetTypeId: "PANEL" })]}
        isLoading={false}
      />,
    );

    expect(screen.getByText("MODEL-123")).toBeInTheDocument();
    expect(screen.queryByText("PANEL")).not.toBeInTheDocument();
  });

  it("falls back to assetTypeId for the subtitle when modelNumber is absent", () => {
    render(<EndUserAssetsList assets={[asset({ assetTypeId: "PANEL" })]} isLoading={false} />);

    expect(screen.getByText("PANEL")).toBeInTheDocument();
  });

  it("renders no subtitle line when neither modelNumber nor assetTypeId is available", () => {
    const { container } = render(
      <EndUserAssetsList assets={[asset({ assetTypeId: "" })]} isLoading={false} />,
    );

    expect(container.querySelectorAll("p").length).toBe(1);
  });

  it("renders an image thumbnail when imageUrl is present", () => {
    render(
      <EndUserAssetsList
        assets={[asset({ imageUrl: "https://cdn/example.png", name: "Solar Panel" })]}
        isLoading={false}
      />,
    );

    expect(screen.getByAltText("Solar Panel")).toHaveAttribute("src", "https://cdn/example.png");
  });

  it("falls back to the package icon when there is no imageUrl", () => {
    const { container } = render(
      <EndUserAssetsList assets={[asset({ name: "Solar Panel" })]} isLoading={false} />,
    );

    expect(screen.queryByAltText("Solar Panel")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("falls back to the package icon after the image fails to load", () => {
    render(
      <EndUserAssetsList
        assets={[asset({ imageUrl: "https://cdn/broken.png", name: "Solar Panel" })]}
        isLoading={false}
      />,
    );

    const img = screen.getByAltText("Solar Panel");
    fireEvent.error(img);

    expect(screen.queryByAltText("Solar Panel")).not.toBeInTheDocument();
  });

  it("renders every asset in the list, keyed by assetId", () => {
    render(
      <EndUserAssetsList
        assets={[
          asset({ assetId: "a1", name: "Solar Panel" }),
          asset({ assetId: "a2", name: "Battery" }),
        ]}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Solar Panel")).toBeInTheDocument();
    expect(screen.getByText("Battery")).toBeInTheDocument();
  });
});
