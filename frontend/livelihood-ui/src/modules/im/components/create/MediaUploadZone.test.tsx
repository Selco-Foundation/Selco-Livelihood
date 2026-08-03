/**
 * Unit tests for MediaUploadZone.tsx.
 *
 * Covers:
 * - `MediaUploadZone` (default export): renders a dashed drop-zone button
 *   wired to a hidden `<input type="file">`; clicking the visible button
 *   forwards the click to the hidden input (so the browser's native file
 *   picker opens); the input's `onChange` handler only calls `onSelect`
 *   when `event.target.files` is non-empty, and always resets
 *   `event.target.value` back to "" afterwards so re-selecting the same
 *   file still fires a change event next time. It also toggles between
 *   the `hint` text and an "Uploading..." fallback based on the
 *   `uploading` prop, disables the trigger/input when `disabled` or
 *   `uploading` is true, and renders either the `error` message or the
 *   `helperText` (error takes precedence) below the zone.
 * - `UploadedFileCard` / `UploadedFileThumbnail` (internal, exercised via
 *   the `uploads` prop): each uploaded entry renders a card showing the
 *   file name, formatted size, and a "Complete" label. The thumbnail
 *   creates an object URL via `URL.createObjectURL` ONLY when the
 *   zone-level `kind` prop is "image" (not the per-entry `kind` field,
 *   which the component ignores for this decision) and falls back to
 *   rendering the passed-in icon otherwise. The object URL is revoked via
 *   `URL.revokeObjectURL` in a `useEffect` cleanup, which React runs both
 *   on unmount and whenever the `previewUrl` dependency changes (i.e. the
 *   entry's `file` reference changes while the card is kept alive by a
 *   stable `key`). Clicking a card's remove button calls `onRemove` with
 *   that entry's `fileStoreId`.
 *
 * Mocking strategy:
 * - jsdom does not implement `URL.createObjectURL` / `URL.revokeObjectURL`
 *   at all (they are simply undefined), so both are stubbed with
 *   `vi.fn()` before each test; the stub returns a name-derived string so
 *   assertions can tie a specific created URL back to the file that
 *   produced it.
 * - The component reads translations via `useTranslate` -> react-i18next's
 *   `useTranslation`, so tests wrap it in a real `I18nextProvider` backed
 *   by a throwaway i18next instance with no resources loaded (mirrors the
 *   pattern in the sibling `FormSelectField.test.tsx`). With no resources,
 *   `t(key)` returns the key itself, so `translateOr` falls back to its
 *   English default strings ("Complete", "Remove", "Uploading...") -
 *   exactly what production renders before translations are fetched.
 * - No router or query-client provider is used: the component makes no
 *   network calls and does not depend on TanStack Router/Query.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { Image as ImageIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFile } from "@/test/mocks/file";
import type { UploadedMediaEntry } from "../../types/create-incident";
import { MediaUploadZone } from "./MediaUploadZone";

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

function renderZone(props: Partial<ComponentProps<typeof MediaUploadZone>> = {}) {
  const onSelect = vi.fn();
  const onRemove = vi.fn();
  const utils = render(
    <I18nextProvider i18n={createTestI18n()}>
      <MediaUploadZone
        label="Photos"
        hint="Tap to upload photos"
        icon={ImageIcon}
        accept="image/*"
        kind="image"
        uploads={[]}
        onSelect={onSelect}
        onRemove={onRemove}
        {...props}
      />
    </I18nextProvider>,
  );
  return { ...utils, onSelect, onRemove };
}

function buildEntry(overrides: Partial<UploadedMediaEntry> = {}): UploadedMediaEntry {
  return {
    file: buildFile("photo.jpg", 2048, "image/jpeg"),
    fileStoreId: "fs-1",
    kind: "image",
    ...overrides,
  };
}

// jsdom has no implementation of these at all (calling the real, missing
// method throws), so every test gets a fresh, trackable stub. The mock
// derives its return value from the file name so a test can assert that a
// specific revoke call matches the URL created for a specific file.
let createObjectURLMock: ReturnType<typeof vi.fn>;
let revokeObjectURLMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  createObjectURLMock = vi.fn((file: File) => `blob:${file.name}`);
  revokeObjectURLMock = vi.fn();
  URL.createObjectURL = createObjectURLMock as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = revokeObjectURLMock as unknown as typeof URL.revokeObjectURL;
});

// The drop-zone trigger button, the hidden file input it forwards clicks
// to, and the disabled/uploading/hint-vs-helper-text/error rendering
// logic that lives directly in `MediaUploadZone`.
describe("MediaUploadZone", () => {
  it("renders the label and hint text", () => {
    renderZone();

    expect(screen.getByText("Photos")).toBeInTheDocument();
    expect(screen.getByText("Tap to upload photos")).toBeInTheDocument();
  });

  it("clicking the visible trigger forwards the click to the hidden file input", async () => {
    // The trigger <button> has no direct file-picking behavior itself; it
    // only works because its onClick calls inputRef.current?.click(). This
    // asserts that wiring by spying on the native click() the ref invokes.
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");
    const user = userEvent.setup();
    renderZone();

    await user.click(screen.getByRole("button", { name: "Tap to upload photos" }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect with the chosen files and resets the input value", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderZone({ label: "Photos" });
    const file = buildFile("selfie.png", 1024, "image/png");

    const input = screen.getByLabelText("Photos") as HTMLInputElement;
    await user.upload(input, file);

    expect(onSelect).toHaveBeenCalledTimes(1);
    const passedFiles = onSelect.mock.calls[0][0] as FileList;
    expect(passedFiles).toHaveLength(1);
    expect(passedFiles[0]).toBe(file);
    // The change handler clears event.target.value after forwarding the
    // files so selecting the identical file again still fires a change.
    expect(input.value).toBe("");
  });

  it("does not call onSelect when the change event carries no files", () => {
    // Guards the `event.target.files?.length` check: an empty FileList
    // (e.g. the user opens and then cancels the native picker) must be a
    // no-op, not a call with an empty list.
    const { onSelect } = renderZone({ label: "Photos" });
    const input = screen.getByLabelText("Photos") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [] } });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows the uploading fallback text and disables the trigger and input while uploading", () => {
    renderZone({ label: "Photos", uploading: true });

    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    expect(screen.queryByText("Tap to upload photos")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Uploading..." })).toBeDisabled();
    expect(screen.getByLabelText("Photos")).toBeDisabled();
  });

  it("disables the trigger and input when disabled is true", () => {
    renderZone({ label: "Photos", disabled: true });

    expect(screen.getByRole("button", { name: "Tap to upload photos" })).toBeDisabled();
    expect(screen.getByLabelText("Photos")).toBeDisabled();
  });

  it("renders the error message instead of helperText when both are provided", () => {
    // The component's ternary checks `error` first, so a truthy error
    // must suppress helperText entirely, not render alongside it.
    renderZone({ error: "File is too large", helperText: "Max 5 MB" });

    expect(screen.getByText("File is too large")).toBeInTheDocument();
    expect(screen.queryByText("Max 5 MB")).not.toBeInTheDocument();
  });

  it("renders helperText when there is no error", () => {
    renderZone({ helperText: "Max 5 MB" });

    expect(screen.getByText("Max 5 MB")).toBeInTheDocument();
  });

  it("renders neither error nor helperText when neither prop is given", () => {
    renderZone();

    expect(screen.queryByText("File is too large")).not.toBeInTheDocument();
    expect(screen.queryByText("Max 5 MB")).not.toBeInTheDocument();
  });
});

// UploadedFileCard/UploadedFileThumbnail rendering for each entry in the
// `uploads` array: file name, formatted size, "Complete" status, and the
// image-vs-icon preview branch driven by the zone-level `kind` prop.
describe("MediaUploadZone uploaded file list", () => {
  it("renders nothing extra when uploads is empty", () => {
    renderZone({ uploads: [] });

    expect(screen.queryByText("Complete")).not.toBeInTheDocument();
  });

  it("renders the file name, formatted size, and complete status for each upload", () => {
    const entry = buildEntry({ file: buildFile("report.jpg", 2048, "image/jpeg") });
    renderZone({ uploads: [entry] });

    expect(screen.getByText("report.jpg")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("creates an object URL and renders an <img> preview when kind is image", () => {
    // The preview decision (`kind === "image" ? URL.createObjectURL(...) : null`)
    // reads the zone-level `kind` prop, not `entry.kind` - this entry's own
    // `kind` is deliberately set to "video" to prove that field is ignored.
    const file = buildFile("photo.jpg", 2048, "image/jpeg");
    const entry = buildEntry({ file, kind: "video" });
    renderZone({ kind: "image", uploads: [entry] });

    expect(createObjectURLMock).toHaveBeenCalledWith(file);
    const img = screen.getByRole("img", { name: "photo.jpg" }) as HTMLImageElement;
    expect(img.src).toContain("blob:photo.jpg");
  });

  it("does not create an object URL and renders the fallback icon when kind is video", () => {
    const entry = buildEntry({ kind: "image" });
    renderZone({ kind: "video", uploads: [entry] });

    expect(createObjectURLMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("revokes the created object URL on unmount", () => {
    const file = buildFile("photo.jpg", 2048, "image/jpeg");
    const entry = buildEntry({ file });
    const { unmount } = renderZone({ kind: "image", uploads: [entry] });

    expect(revokeObjectURLMock).not.toHaveBeenCalled();
    unmount();

    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:photo.jpg");
  });

  it("revokes the previous object URL when the same card's file is replaced", () => {
    // Same fileStoreId (same React key => same UploadedFileThumbnail
    // instance survives the update) but a different `file` reference, so
    // the `useMemo`/`useEffect` dependency changes: React must run the old
    // effect's cleanup (revoking the first URL) before creating the new one.
    const entryV1 = buildEntry({ file: buildFile("v1.jpg", 1024, "image/jpeg"), fileStoreId: "fs-1" });
    const entryV2 = buildEntry({ file: buildFile("v2.jpg", 1024, "image/jpeg"), fileStoreId: "fs-1" });
    const { rerender } = renderZone({ kind: "image", uploads: [entryV1] });

    rerender(
      <I18nextProvider i18n={createTestI18n()}>
        <MediaUploadZone
          label="Photos"
          hint="Tap to upload photos"
          icon={ImageIcon}
          accept="image/*"
          kind="image"
          uploads={[entryV2]}
          onSelect={vi.fn()}
          onRemove={vi.fn()}
        />
      </I18nextProvider>,
    );

    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:v1.jpg");
    expect(createObjectURLMock).toHaveBeenCalledWith(entryV2.file);
    expect(screen.getByRole("img", { name: "v2.jpg" })).toBeInTheDocument();
  });

  it("calls onRemove with the fileStoreId of the clicked entry", async () => {
    const user = userEvent.setup();
    const entryA = buildEntry({ fileStoreId: "fs-a", file: buildFile("a.jpg", 1024, "image/jpeg") });
    const entryB = buildEntry({ fileStoreId: "fs-b", file: buildFile("b.jpg", 1024, "image/jpeg") });
    const { onRemove } = renderZone({ uploads: [entryA, entryB] });

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    expect(removeButtons).toHaveLength(2);
    await user.click(removeButtons[1]);

    expect(onRemove).toHaveBeenCalledWith("fs-b");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("renders a card per upload for multiple entries", () => {
    const entryA = buildEntry({ fileStoreId: "fs-a", file: buildFile("a.jpg", 1024, "image/jpeg") });
    const entryB = buildEntry({ fileStoreId: "fs-b", file: buildFile("b.jpg", 1024, "image/jpeg") });
    renderZone({ uploads: [entryA, entryB] });

    expect(screen.getByText("a.jpg")).toBeInTheDocument();
    expect(screen.getByText("b.jpg")).toBeInTheDocument();
    expect(screen.getAllByText("Complete")).toHaveLength(2);
  });
});
