import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Camera } from "lucide-react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { UploadedMediaEntry } from "../../types/create-incident";
import { MediaUploadZone } from "./MediaUploadZone";

// jsdom doesn't implement URL.createObjectURL/revokeObjectURL, which
// UploadedFileThumbnail calls for image previews.
beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

function makeEntry(overrides: Partial<UploadedMediaEntry> = {}): UploadedMediaEntry {
  return {
    file: new File(["content"], "photo.png", { type: "image/png" }),
    fileStoreId: "fs-1",
    kind: "image",
    ...overrides,
  };
}

describe("MediaUploadZone", () => {
  it("renders the label and hint text", () => {
    render(
      <MediaUploadZone
        label="Upload Images"
        hint="Tap to upload images"
        icon={Camera}
        accept="image/*"
        uploads={[]}
        kind="image"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Upload Images")).toBeInTheDocument();
    expect(screen.getByText("Tap to upload images")).toBeInTheDocument();
  });

  it("shows the uploading label instead of the hint while uploading", () => {
    render(
      <MediaUploadZone
        label="Upload Images"
        hint="Tap to upload images"
        icon={Camera}
        accept="image/*"
        uploading
        uploads={[]}
        kind="image"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    expect(screen.queryByText("Tap to upload images")).not.toBeInTheDocument();
  });

  it("shows helperText when there is no error", () => {
    render(
      <MediaUploadZone
        label="Upload Images"
        hint="Tap to upload images"
        helperText="Up to 5 images"
        icon={Camera}
        accept="image/*"
        uploads={[]}
        kind="image"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Up to 5 images")).toBeInTheDocument();
  });

  it("shows the error message instead of helperText when both are given", () => {
    render(
      <MediaUploadZone
        label="Upload Images"
        hint="Tap to upload images"
        helperText="Up to 5 images"
        error="Only JPG, JPEG, PNG formats are supported"
        icon={Camera}
        accept="image/*"
        uploads={[]}
        kind="image"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Only JPG, JPEG, PNG formats are supported"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Up to 5 images")).not.toBeInTheDocument();
  });

  it("calls onSelect with the chosen files when a file is picked via the hidden input", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <MediaUploadZone
        label="Upload Images"
        hint="Tap to upload images"
        icon={Camera}
        accept="image/*"
        multiple
        uploads={[]}
        kind="image"
        onSelect={onSelect}
        onRemove={vi.fn()}
      />,
    );

    const file = new File(["content"], "photo.png", { type: "image/png" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(onSelect).toHaveBeenCalledTimes(1);
    const passedFiles = onSelect.mock.calls[0][0] as FileList;
    expect(passedFiles).toHaveLength(1);
    expect(passedFiles[0]).toBe(file);
  });

  it("disables the trigger button and the file input when disabled is true", () => {
    const { container } = render(
      <MediaUploadZone
        label="Upload Images"
        hint="Tap to upload images"
        icon={Camera}
        accept="image/*"
        disabled
        uploads={[]}
        kind="image"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole("button")).toBeDisabled();
    expect(container.querySelector('input[type="file"]')).toBeDisabled();
  });

  it("disables the trigger button and the file input while uploading", () => {
    const { container } = render(
      <MediaUploadZone
        label="Upload Images"
        hint="Tap to upload images"
        icon={Camera}
        accept="image/*"
        uploading
        uploads={[]}
        kind="image"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole("button")).toBeDisabled();
    expect(container.querySelector('input[type="file"]')).toBeDisabled();
  });

  it("renders each uploaded entry's file name and formatted size", () => {
    render(
      <MediaUploadZone
        label="Upload Images"
        hint="Tap to upload images"
        icon={Camera}
        accept="image/*"
        uploads={[makeEntry({ fileStoreId: "fs-1" })]}
        kind="image"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.getByText("7 B")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("renders no uploaded-file cards when uploads is empty", () => {
    render(
      <MediaUploadZone
        label="Upload Images"
        hint="Tap to upload images"
        icon={Camera}
        accept="image/*"
        uploads={[]}
        kind="image"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.queryByText("Complete")).not.toBeInTheDocument();
  });

  it("calls onRemove with the entry's fileStoreId when its remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <MediaUploadZone
        label="Upload Images"
        hint="Tap to upload images"
        icon={Camera}
        accept="image/*"
        uploads={[makeEntry({ fileStoreId: "fs-1" })]}
        kind="image"
        onSelect={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(onRemove).toHaveBeenCalledWith("fs-1");
  });

  it("renders a fallback icon thumbnail (not an image preview) for a video upload", () => {
    const { container } = render(
      <MediaUploadZone
        label="Upload Videos"
        hint="Tap to upload videos"
        icon={Camera}
        accept="video/*"
        uploads={[makeEntry({ kind: "video", file: new File(["content"], "clip.mp4", { type: "video/mp4" }) })]}
        kind="video"
        onSelect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("clip.mp4")).toBeInTheDocument();
  });
});
