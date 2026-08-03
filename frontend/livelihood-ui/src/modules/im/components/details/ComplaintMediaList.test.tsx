/**
 * Unit tests for `ComplaintMediaList` (src/modules/im/components/details/ComplaintMediaList.tsx).
 *
 * Covers:
 *  - `ComplaintMediaList` renders nothing when both `images` and `videos` are empty.
 *  - Image branch: each entry in `images` is classified via `getAttachmentKind`
 *    (a real, unmocked utility — its extension parsing is exercised directly rather
 *    than stubbed, since it is pure and cheap):
 *      - "image" kind -> a link wrapping an `<img>`.
 *      - "pdf" kind -> a link with the `FileText` icon, the file name, and an
 *        uppercased extension badge.
 *      - "document" (any other) kind -> a link with the generic `FileIcon`, the
 *        file name, and an uppercased extension badge.
 *      - the extension badge is omitted entirely when the derived file name is empty
 *        (e.g. a URL ending in "/").
 *  - Video branch: each entry in `videos` renders one of three ways depending on
 *    which fields are populated:
 *      - `original` set -> a native `<video>` element with that `src`.
 *      - only `master` set -> a "View video" link pointing at `master`.
 *      - neither set -> nothing rendered for that entry.
 *  - The `attachmentLabel` and "View video" text both go through `translateOr`,
 *    so a translation resource is honored when present and a hard-coded English
 *    fallback is used when the key is missing.
 *  - The `imageGridClassName` prop overrides the default grid className.
 *
 * Testing approach:
 *  - `ComplaintMediaList` calls `useTranslate` (react-i18next's `useTranslation` under
 *    the hood), so every render is wrapped in a lightweight, test-only i18next
 *    instance via `I18nextProvider` — never the app's real network-backed i18n setup.
 *    No router or query-client provider is needed since the component reads no
 *    route/query state, so `renderWithProviders` is not used here; a minimal local
 *    wrapper mirrors the pattern from `EndUserAssetsList.test.tsx`.
 *  - `getAttachmentKind`/`getFileName` are real (unmocked) pure functions from
 *    `@/modules/im/utils/file`; branch coverage is achieved by choosing input URLs
 *    whose extensions naturally fall into each kind, rather than mocking the module.
 *  - Icons are distinguished by lucide-react's auto-generated class name
 *    (`lucide-file-text` vs `lucide-file`) since both icons render as unlabeled,
 *    `aria-hidden` SVGs with no accessible name.
 */
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it } from "vitest";
import { ComplaintMediaList, type ComplaintVideoEntry } from "./ComplaintMediaList";

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

function renderMediaList(
  props: Partial<ComponentProps<typeof ComplaintMediaList>>,
  i18nResources: Record<string, string> = {},
) {
  return render(
    <I18nextProvider i18n={createTestI18n(i18nResources)}>
      <ComplaintMediaList images={[]} videos={[]} {...props} />
    </I18nextProvider>,
  );
}

describe("ComplaintMediaList", () => {
  // The component returns `null` (renders nothing) when there is no media at all —
  // this is the guard clause `if (!images.length && !videos.length) return null`.
  it("renders nothing when there are no images and no videos", () => {
    const { container } = renderMediaList({ images: [], videos: [] });
    expect(container).toBeEmptyDOMElement();
  });

  // getAttachmentKind() classifies by file extension (case-insensitive, ignoring
  // query/hash), so a ".jpg" URL is routed down the <img> branch rather than the
  // generic file-icon branch.
  it("renders an image attachment as a linked img with an accessible label", () => {
    renderMediaList({ images: ["https://cdn.example.com/photo.jpg"], videos: [] });

    const link = screen.getByRole("link", { name: "Attachment 1" });
    expect(link).toHaveAttribute("href", "https://cdn.example.com/photo.jpg");
    expect(link).toHaveAttribute("target", "_blank");

    const img = screen.getByRole("img", { name: "Attachment 1" });
    expect(img).toHaveAttribute("src", "https://cdn.example.com/photo.jpg");
  });

  // A ".pdf" extension is classified as kind "pdf", which selects the FileText
  // icon (lucide class "lucide-file-text") instead of the generic FileIcon.
  it("renders a pdf attachment with the FileText icon, file name, and extension badge", () => {
    renderMediaList({ images: ["https://cdn.example.com/docs/report.pdf?token=abc"], videos: [] });

    const link = screen.getByRole("link", { name: "Attachment 1" });
    expect(link).toHaveAttribute("href", "https://cdn.example.com/docs/report.pdf?token=abc");
    expect(link.querySelector("svg.lucide-file-text")).toBeInTheDocument();
    expect(link.querySelector("svg.lucide-file")).not.toBeInTheDocument();
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  // Any extension that is neither an image type nor "pdf" falls through to the
  // generic "document" kind, which uses the plain FileIcon (lucide class "lucide-file").
  it("renders a non-pdf, non-image attachment with the generic FileIcon, file name, and extension badge", () => {
    renderMediaList({ images: ["https://cdn.example.com/archive.zip"], videos: [] });

    const link = screen.getByRole("link", { name: "Attachment 1" });
    expect(link.querySelector("svg.lucide-file")).toBeInTheDocument();
    expect(link.querySelector("svg.lucide-file-text")).not.toBeInTheDocument();
    expect(screen.getByText("archive.zip")).toBeInTheDocument();
    expect(screen.getByText("ZIP")).toBeInTheDocument();
  });

  // getFileName() takes the last "/"-segment of the URL; a URL ending in "/" yields
  // an empty file name, whose extension is also the empty string. Since `ext` is
  // falsy in that case, the component's `{ext ? (...) : null}` hides the badge span
  // entirely rather than rendering an empty one.
  it("omits the extension badge when the derived file name is empty", () => {
    renderMediaList({ images: ["https://cdn.example.com/folder/"], videos: [] });

    const link = screen.getByRole("link", { name: "Attachment 1" });
    // No badge span (rounded bg-muted pill) should be present for this entry.
    expect(link.querySelector("span.rounded.bg-muted")).not.toBeInTheDocument();
  });

  it("labels each image attachment with its 1-based index", () => {
    renderMediaList({
      images: ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.png"],
      videos: [],
    });

    expect(screen.getByRole("link", { name: "Attachment 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Attachment 2" })).toBeInTheDocument();
  });

  it("applies a custom imageGridClassName to the image grid container", () => {
    renderMediaList({
      images: ["https://cdn.example.com/a.jpg"],
      videos: [],
      imageGridClassName: "custom-grid-class",
    });

    const grid = screen.getByRole("link", { name: "Attachment 1" }).parentElement;
    expect(grid).toHaveClass("custom-grid-class");
  });

  // When `t()` cannot resolve "CS_COMMON_ATTACHMENT" (no matching resource loaded),
  // translateOr's `value === key` check is true, so it falls back to the hard-coded
  // English default "Attachment" rather than surfacing the raw i18n key.
  it("falls back to the default English attachment label when no translation resource is loaded", () => {
    renderMediaList({ images: ["https://cdn.example.com/a.jpg"], videos: [] }, {});
    expect(screen.getByRole("link", { name: "Attachment 1" })).toBeInTheDocument();
  });

  // Conversely, when a "CS_COMMON_ATTACHMENT" resource IS loaded, t() resolves to
  // that value (not the key), so translateOr returns the translated string instead
  // of the fallback.
  it("uses the translated attachment label when a translation resource is provided", () => {
    renderMediaList(
      { images: ["https://cdn.example.com/a.jpg"], videos: [] },
      { CS_COMMON_ATTACHMENT: "Attachte" },
    );
    expect(screen.getByRole("link", { name: "Attachte 1" })).toBeInTheDocument();
  });

  // `video.original`, when present, is preferred over `video.master`: it renders a
  // native <video controls> element sourced directly from `original`, regardless of
  // whether `master` is also set.
  it("renders a native video element when original is set", () => {
    const videos: ComplaintVideoEntry[] = [{ original: "https://cdn.example.com/clip.mp4", master: "https://cdn.example.com/clip-master.mp4" }];
    const { container } = renderMediaList({ images: [], videos });

    const videoEl = container.querySelector("video");
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute("src", "https://cdn.example.com/clip.mp4");
    expect(videoEl).toHaveAttribute("controls");
    // No fallback "View video" link should render when a playable <video> is shown.
    expect(screen.queryByRole("link", { name: "View video" })).not.toBeInTheDocument();
  });

  // When `original` is absent but `master` is present, the component falls back to
  // rendering a plain "View video" link pointing at `master` (e.g. for renditions
  // that only ship a downloadable master file, not a streamable original).
  it("renders a 'View video' link when only master is set", () => {
    const videos: ComplaintVideoEntry[] = [{ master: "https://cdn.example.com/clip-master.mp4" }];
    const { container } = renderMediaList({ images: [], videos });

    expect(container.querySelector("video")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: "View video" });
    expect(link).toHaveAttribute("href", "https://cdn.example.com/clip-master.mp4");
  });

  // The "View video" link text also passes through translateOr, so a loaded
  // "CS_COMMON_VIEW_VIDEO" resource overrides the English fallback.
  it("uses the translated 'View video' text when a translation resource is provided", () => {
    const videos: ComplaintVideoEntry[] = [{ master: "https://cdn.example.com/clip-master.mp4" }];
    renderMediaList({ images: [], videos }, { CS_COMMON_VIEW_VIDEO: "Video dekhein" });

    expect(screen.getByRole("link", { name: "Video dekhein" })).toBeInTheDocument();
  });

  // Neither `original` nor `master` set means the video entry has nothing playable
  // or linkable to show; the ternary chain falls through to `null` for that item,
  // leaving its wrapping <div> present but empty.
  it("renders nothing for a video entry with neither original nor master", () => {
    const videos: ComplaintVideoEntry[] = [{}];
    const { container } = renderMediaList({ images: [], videos });

    expect(container.querySelector("video")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View video" })).not.toBeInTheDocument();
  });

  it("renders both images and videos together when both are provided", () => {
    const videos: ComplaintVideoEntry[] = [{ original: "https://cdn.example.com/clip.mp4" }];
    const { container } = renderMediaList({
      images: ["https://cdn.example.com/photo.jpg"],
      videos,
    });

    expect(screen.getByRole("img", { name: "Attachment 1" })).toBeInTheDocument();
    expect(container.querySelector("video")).toBeInTheDocument();
  });
});
