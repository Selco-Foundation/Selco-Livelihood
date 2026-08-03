/**
 * Unit tests for EndUserAssetsList.
 *
 * EndUserAssetsList renders the "My Registered Assets" section on the end-user
 * dashboard: a loading message while data is fetched, an empty-state message
 * when the caller has no assets, or a wrapping row/column of asset cards
 * (AssetBlock) otherwise. Each card shows the asset's name, a subtitle built
 * from its model number/asset type and serial number, and a thumbnail image
 * that falls back to a placeholder icon when missing or broken.
 *
 * Testing approach: the component reads translated strings via useTranslate,
 * so every test wraps the component in a real (not mocked) I18nextProvider
 * backed by an isolated i18next instance with empty translation resources.
 * Because the resources are empty, translateOr's fallback English text is
 * what actually renders, so assertions can match on stable, human-readable
 * strings ("Loading...", "No assets found", etc.) rather than translation
 * keys. No other mocking is needed: AssetThumbnail's image-error fallback is
 * exercised directly via fireEvent.error on the rendered <img>.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it } from "vitest";
import type { EndUserAsset } from "../hooks/use-end-user-assets";
import { EndUserAssetsList } from "./EndUserAssetsList";

// Builds an isolated i18next instance per test with no translation resources
// loaded, so translateOr(t, key, fallback) always resolves to the fallback
// English copy -- letting assertions target readable text instead of keys.
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

// Minimal valid EndUserAsset with sensible defaults; individual tests override
// only the fields relevant to the behavior under test (imageUrl, serialNumber,
// modelNumber, assetTypeId).
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

// Renders EndUserAssetsList with the given assets/isLoading props, wrapped in
// a fresh I18nextProvider so translateOr resolves to fallback English text.
function renderList(assets: EndUserAsset[], isLoading = false) {
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <EndUserAssetsList assets={assets} isLoading={isLoading} />
    </I18nextProvider>,
  );
}

// EndUserAssetsList: renders the "My Registered Assets" panel. Given
// `isLoading` it shows a loading message; otherwise, given an empty `assets`
// array it shows an empty-state message; otherwise it renders one AssetBlock
// card per asset (via internal helpers assetSubtitle/AssetThumbnail/AssetBlock).
// isLoading takes precedence over the empty-assets check, so both states are
// tested independently below.
describe("EndUserAssetsList", () => {
  it("shows a loading message when isLoading is true", () => {
    renderList([], true);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no assets", () => {
    renderList([]);
    expect(screen.getByText("No assets found")).toBeInTheDocument();
  });

  // assetSubtitle() prefers modelNumber over assetTypeId for the category
  // segment, and prefixes serialNumber with "#"; both parts are joined with
  // " • " when present.
  it("renders a card per asset with a joined subtitle", () => {
    renderList([buildAsset({ serialNumber: "SN1", modelNumber: "Model X" })]);
    expect(screen.getByText("Streetlight 1")).toBeInTheDocument();
    expect(screen.getByText("Model X • #SN1")).toBeInTheDocument();
  });

  // assetSubtitle() filters out falsy parts before joining; when both the
  // category (modelNumber/assetTypeId) and serialNumber are empty/undefined,
  // the joined string is empty and AssetBlock skips rendering the subtitle
  // <p> entirely (no stray "•" separator should appear).
  it("omits the subtitle line when there is no category or serial", () => {
    renderList([buildAsset({ assetTypeId: "", modelNumber: undefined, serialNumber: undefined })]);
    expect(screen.getByText("Streetlight 1")).toBeInTheDocument();
    expect(screen.queryByText("•")).not.toBeInTheDocument();
  });

  // AssetThumbnail: when asset.imageUrl is set (and hasn't errored yet), it
  // renders an <img> pointing at that URL instead of the placeholder icon.
  it("renders the asset image when imageUrl is present", () => {
    renderList([buildAsset({ imageUrl: "https://cdn/asset.jpg" })]);
    expect(screen.getByRole("img", { name: "Streetlight 1" })).toHaveAttribute(
      "src",
      "https://cdn/asset.jpg",
    );
  });

  // AssetThumbnail tracks image load failure in local `failed` state via
  // onError; once the <img> fires an error event, it swaps to the
  // placeholder <Package> icon and no longer renders an <img> element at all.
  it("falls back to the placeholder icon when the image fails to load", () => {
    renderList([buildAsset({ imageUrl: "https://cdn/broken.jpg" })]);
    const img = screen.getByRole("img", { name: "Streetlight 1" });

    fireEvent.error(img);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  // AssetThumbnail: with no imageUrl at all, it renders the placeholder icon
  // directly and never mounts an <img> element.
  it("shows the placeholder icon when there is no imageUrl", () => {
    renderList([buildAsset({ imageUrl: undefined })]);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
