import { fireEvent, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it } from "vitest";
import type { EndUserAsset } from "../hooks/use-end-user-assets";
import { EndUserAssetsList } from "./EndUserAssetsList";

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

function buildAsset(overrides: Partial<EndUserAsset> = {}): EndUserAsset {
  return {
    assetId: "asset-1",
    tenantId: "livelihood",
    facilityId: "fac-1",
    boundaryCode: "B1",
    assetTypeId: "streetlight",
    name: "Streetlight 1",
    ...overrides,
  };
}

function renderList(assets: EndUserAsset[], isLoading = false) {
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <EndUserAssetsList assets={assets} isLoading={isLoading} />
    </I18nextProvider>,
  );
}

describe("EndUserAssetsList", () => {
  it("shows a loading message when isLoading is true", () => {
    renderList([], true);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no assets", () => {
    renderList([]);
    expect(screen.getByText("No assets found")).toBeInTheDocument();
  });

  it("renders a card per asset with a joined subtitle", () => {
    renderList([buildAsset({ serialNumber: "SN1", modelNumber: "Model X" })]);
    expect(screen.getByText("Streetlight 1")).toBeInTheDocument();
    expect(screen.getByText("Model X • #SN1")).toBeInTheDocument();
  });

  it("omits the subtitle line when there is no category or serial", () => {
    renderList([buildAsset({ assetTypeId: "", modelNumber: undefined, serialNumber: undefined })]);
    expect(screen.getByText("Streetlight 1")).toBeInTheDocument();
    expect(screen.queryByText("•")).not.toBeInTheDocument();
  });

  it("renders the asset image when imageUrl is present", () => {
    renderList([buildAsset({ imageUrl: "https://cdn/asset.jpg" })]);
    expect(screen.getByRole("img", { name: "Streetlight 1" })).toHaveAttribute(
      "src",
      "https://cdn/asset.jpg",
    );
  });

  it("falls back to the placeholder icon when the image fails to load", () => {
    renderList([buildAsset({ imageUrl: "https://cdn/broken.jpg" })]);
    const img = screen.getByRole("img", { name: "Streetlight 1" });

    fireEvent.error(img);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the placeholder icon when there is no imageUrl", () => {
    renderList([buildAsset({ imageUrl: undefined })]);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
