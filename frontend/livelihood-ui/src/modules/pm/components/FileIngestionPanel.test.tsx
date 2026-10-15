import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileIngestionPanel } from "./FileIngestionPanel";

function renderPanel(overrides: Partial<React.ComponentProps<typeof FileIngestionPanel>> = {}) {
  const onDownload = vi.fn();
  const onFileSelected = vi.fn();
  const onPreview = vi.fn();
  const props: React.ComponentProps<typeof FileIngestionPanel> = {
    status: "idle",
    errorCount: 0,
    downloadLabel: "Download Template",
    accept: ".xlsx",
    uploadHint: "Click to upload",
    doneMessage: "All done",
    previewFile: null,
    previewHasErrors: false,
    isBusy: false,
    onDownload,
    onFileSelected,
    onPreview,
    ...overrides,
  };
  const result = render(<FileIngestionPanel {...props} />);
  return { ...result, onDownload, onFileSelected, onPreview };
}

function getFileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe("FileIngestionPanel", () => {
  it("shows the plan code when given", () => {
    renderPanel({ planCode: "KA-INS-2026-001" });

    expect(screen.getByText("KA-INS-2026-001")).toBeInTheDocument();
  });

  it("omits the plan code row when not given", () => {
    renderPanel();

    expect(screen.queryByText("Installation Plan Code:")).not.toBeInTheDocument();
  });

  it("calls onDownload when the download button is clicked", async () => {
    const user = userEvent.setup();
    const { onDownload } = renderPanel();

    await user.click(screen.getByRole("button", { name: /Download Template/i }));

    expect(onDownload).toHaveBeenCalled();
  });

  it("disables the download button when downloadDisabled is true", () => {
    renderPanel({ downloadDisabled: true });

    expect(screen.getByRole("button", { name: /Download Template/i })).toBeDisabled();
  });

  it("calls onFileSelected with an accepted file", () => {
    const { onFileSelected, container } = renderPanel();
    const file = new File(["data"], "scope.xlsx");

    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("shows an invalid-file-type message and does not call onFileSelected for a rejected extension", () => {
    const { onFileSelected, container } = renderPanel();
    const file = new File(["data"], "scope.csv");

    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Please upload a valid .xlsx file");
  });

  it("shows 'Validating...' text while status is validating", () => {
    renderPanel({ status: "validating" });

    expect(screen.getByText("Validating...")).toBeInTheDocument();
  });

  it("shows the done message once status is done", () => {
    renderPanel({ status: "done" });

    expect(screen.getByText("All done")).toBeInTheDocument();
  });

  it("shows a Preview File button once a previewFile exists, calling onPreview when clicked", async () => {
    const user = userEvent.setup();
    const { onPreview } = renderPanel({ previewFile: { blob: new Blob(["x"]), filename: "f.xlsx" } });

    await user.click(screen.getByRole("button", { name: /Preview File/i }));

    expect(onPreview).toHaveBeenCalled();
  });

  it("shows the error count and a 'view errors' preview label when the preview has errors", () => {
    renderPanel({
      previewFile: { blob: new Blob(["x"]), filename: "f.xlsx" },
      previewHasErrors: true,
      errorCount: 3,
    });

    expect(screen.getByText(/Found errors in the uploaded file/)).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: /Preview File \(view errors\)/i })).toBeInTheDocument();
  });

  it("disables the download button and upload dropzone while busy", () => {
    renderPanel({ isBusy: true });

    expect(screen.getByRole("button", { name: /Download Template/i })).toBeDisabled();
    expect(screen.getByText("Click to upload").closest("button")).toBeDisabled();
  });
});
