/**
 * Unit tests for `ComplaintMediaSection` (src/modules/im/components/details/ComplaintMediaSection.tsx).
 *
 * Covers:
 *  - The guard clause: renders nothing (`null`) when both `images` and `videos`
 *    are empty, mirroring the identical guard in the child `ComplaintMediaList`.
 *  - When there is at least one image or video, it renders a `FormSectionCard`
 *    wrapper with:
 *      - the `ImageIcon` lucide icon,
 *      - a title resolved through `translateOr(t, "CS_COMMON_ATTACHMENTS", "Attachments")`
 *        (English fallback when the key is unresolved, translated text when the
 *        i18n resource is loaded),
 *      - `titleClassName="text-base font-semibold text-ink-950"` applied to the
 *        heading,
 *      - `divider` truthy, which makes `FormSectionCard` render an `<hr>` between
 *        the header and the body.
 *  - It forwards `images`/`videos` unchanged to `ComplaintMediaList`, which does
 *    the actual media rendering (image links/imgs, pdf/document tiles, video
 *    elements, "View video" links). Only a thin cross-section is verified here
 *    (one image + one video render through) since `ComplaintMediaList`'s own
 *    branches are already exhaustively covered in ComplaintMediaList.test.tsx.
 *
 * Testing approach:
 *  - `ComplaintMediaSection` (like `ComplaintMediaList`) calls `useTranslate`
 *    (react-i18next's `useTranslation`), so every render is wrapped in a
 *    lightweight, test-only i18next instance via `I18nextProvider` — never the
 *    app's real network-backed i18n setup. No router or query-client provider is
 *    used since the component reads no route/query state.
 *  - `FormSectionCard` and `ComplaintMediaList` are real (unmocked); this keeps
 *    the tests close to actual rendered output (icon, title, divider, media
 *    markup) rather than asserting on mocked stand-ins.
 */
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it } from "vitest";
import { ComplaintMediaSection } from "./ComplaintMediaSection";
import type { ComplaintVideoEntry } from "./ComplaintMediaList";

function createTestI18n(resources: Record<string, string> = {}) {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: { en_IN: { translations: resources } },
    react: { useSuspense: false },
  });
  return instance;
}

function renderMediaSection(
  props: Partial<ComponentProps<typeof ComplaintMediaSection>>,
  i18nResources: Record<string, string> = {},
) {
  return render(
    <I18nextProvider i18n={createTestI18n(i18nResources)}>
      <ComplaintMediaSection images={[]} videos={[]} {...props} />
    </I18nextProvider>,
  );
}

// ComplaintMediaSection: a presentational wrapper that renders a titled
// FormSectionCard around ComplaintMediaList, or nothing at all when there is
// no media to show. It expects `images: string[]` and `videos: ComplaintVideoEntry[]`.
describe("ComplaintMediaSection", () => {
  // Guard clause `if (!images.length && !videos.length) return null` — identical
  // in shape to ComplaintMediaList's own guard, so an empty section renders no DOM.
  it("renders nothing when there are no images and no videos", () => {
    const { container } = renderMediaSection({ images: [], videos: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when images and videos props are omitted (both empty by default)", () => {
    const { container } = renderMediaSection({});
    expect(container).toBeEmptyDOMElement();
  });

  // With at least one image, the guard is bypassed and the FormSectionCard shell
  // (icon + heading) is rendered. The default English fallback text
  // "Attachments" is used because no "CS_COMMON_ATTACHMENTS" resource is loaded,
  // so translateOr's `value === key` check triggers the hard-coded fallback.
  it("renders the FormSectionCard heading with the default English fallback title", () => {
    renderMediaSection({ images: ["https://cdn.example.com/photo.jpg"], videos: [] });

    const heading = screen.getByRole("heading", { name: "Attachments" });
    expect(heading).toBeInTheDocument();
    // titleClassName is passed through verbatim to the <h2>.
    expect(heading).toHaveClass("text-base", "font-semibold", "text-ink-950");
  });

  // When a "CS_COMMON_ATTACHMENTS" translation resource IS loaded, t() resolves
  // to that value (not the key), so translateOr returns the translated string
  // instead of the "Attachments" fallback.
  it("renders the translated title when a translation resource is provided", () => {
    renderMediaSection(
      { images: ["https://cdn.example.com/photo.jpg"], videos: [] },
      { CS_COMMON_ATTACHMENTS: "Sanlagnak" },
    );

    expect(screen.getByRole("heading", { name: "Sanlagnak" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Attachments" })).not.toBeInTheDocument();
  });

  // FormSectionCard's icon slot renders the ImageIcon lucide component, which
  // (like all lucide icons used elsewhere in this module) is aria-hidden and
  // identified by its auto-generated "lucide-image" class name.
  it("renders the ImageIcon in the section header", () => {
    const { container } = renderMediaSection({ images: ["https://cdn.example.com/photo.jpg"], videos: [] });
    expect(container.querySelector("svg.lucide-image")).toBeInTheDocument();
  });

  // `divider` is hard-coded truthy on the FormSectionCard usage inside
  // ComplaintMediaSection, so an <hr> separates the header from the media body
  // whenever the section renders at all.
  it("renders a divider between the header and the media content", () => {
    const { container } = renderMediaSection({ images: ["https://cdn.example.com/photo.jpg"], videos: [] });
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  // Cross-section check that images/videos are forwarded to ComplaintMediaList
  // unchanged: one image renders as a linked <img>, one video with `original`
  // set renders as a native <video> element. ComplaintMediaList's own branch
  // coverage (pdf/document kinds, master-only videos, etc.) lives in
  // ComplaintMediaList.test.tsx and is not re-verified here.
  it("forwards images and videos to ComplaintMediaList for rendering", () => {
    const videos: ComplaintVideoEntry[] = [{ original: "https://cdn.example.com/clip.mp4" }];
    const { container } = renderMediaSection({
      images: ["https://cdn.example.com/photo.jpg"],
      videos,
    });

    const img = screen.getByRole("img", { name: "Attachment 1" });
    expect(img).toHaveAttribute("src", "https://cdn.example.com/photo.jpg");

    const videoEl = container.querySelector("video");
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute("src", "https://cdn.example.com/clip.mp4");
  });

  // Videos-only input (no images) should still bypass the guard clause and
  // render the section, exercising the "!images.length" side of the `&&` guard
  // independently from the images-only cases above.
  it("renders the section when only videos are provided (no images)", () => {
    const videos: ComplaintVideoEntry[] = [{ master: "https://cdn.example.com/clip-master.mp4" }];
    renderMediaSection({ images: [], videos });

    expect(screen.getByRole("heading", { name: "Attachments" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View video" })).toHaveAttribute(
      "href",
      "https://cdn.example.com/clip-master.mp4",
    );
  });
});
