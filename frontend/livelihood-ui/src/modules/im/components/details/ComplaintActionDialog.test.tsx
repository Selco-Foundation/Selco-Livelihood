import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { MAX_COMMENT_LENGTH, MAX_IMAGE_COUNT, MAX_QUOTATION_SIZE_MB } from "../../utils/media-validation";
import type { ComplaintDetailsData } from "../../types/incident-details";
import { ComplaintActionDialog } from "./ComplaintActionDialog";

vi.mock("../../services/workflow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/workflow")>();
  return { ...actual, fetchReasonOptions: vi.fn(), updateIncidentAction: vi.fn() };
});
vi.mock("../../services/vendor", () => ({ fetchVendorOptions: vi.fn() }));
vi.mock("../../services/file-upload", () => ({
  uploadIncidentFile: vi.fn(),
  uploadIncidentVideo: vi.fn(),
}));

import { fetchReasonOptions, updateIncidentAction } from "../../services/workflow";
import { fetchVendorOptions } from "../../services/vendor";
import { uploadIncidentFile } from "../../services/file-upload";

const authedUser = { uuid: "user-1", roles: [{ code: "COMPLAINT_RESOLVER" }] };

function defaultComplaintDetails(
  overrides: Partial<ComplaintDetailsData["incident"]> = {},
): ComplaintDetailsData {
  return {
    incidentId: "inc-1",
    tenantId: "tenant-1",
    rows: [],
    incident: {
      tenantId: "tenant-1",
      incidentId: "inc-1",
      applicationStatus: "PENDING_FOR_RESOLUTION",
      incidentType: "SOLAR",
      incidentSubType: "PANEL",
      boundaryCode: "BOUNDARY_1",
      reporter: { name: "John Reporter" },
      ...overrides,
    },
    workflow: {},
    images: [],
    videos: [],
    thumbnails: [],
  };
}

function renderDialog(overrides: Partial<ComponentProps<typeof ComplaintActionDialog>> = {}) {
  const onClose = vi.fn();
  const onComplete = vi.fn().mockResolvedValue(undefined);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const props: ComponentProps<typeof ComplaintActionDialog> = {
    action: "RESOLVE",
    complaintDetails: defaultComplaintDetails(),
    onClose,
    onComplete,
    ...overrides,
  };
  const result = render(
    <QueryClientProvider client={queryClient}>
      <ComplaintActionDialog {...props} />
    </QueryClientProvider>,
  );
  return { ...result, onClose, onComplete };
}

function fileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

// SearchableSelect's trigger announces "<label> <value-or-placeholder>" via
// aria-labelledby, so matching on name alone is brittle — find it via the
// label text's own wrapper instead (label and the Popover trigger are siblings).
function selectTriggerFor(labelText: string) {
  const label = screen.getByText(labelText);
  return label.parentElement!.querySelector("button") as HTMLButtonElement;
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: "token-1", user: authedUser });
  vi.mocked(fetchReasonOptions).mockReset().mockResolvedValue({});
  vi.mocked(fetchVendorOptions).mockReset().mockResolvedValue([]);
  vi.mocked(uploadIncidentFile).mockReset().mockResolvedValue({ fileStoreId: "fs-1" });
  vi.mocked(updateIncidentAction)
    .mockReset()
    .mockResolvedValue({ IncidentWrappers: [{ incident: {}, workflow: {} } as never] });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("ComplaintActionDialog", () => {
  it("renders nothing for an action outside the supported workflow action set", () => {
    const { container } = renderDialog({ action: "NOT_A_REAL_ACTION" });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the translated action name as the dialog heading", () => {
    renderDialog({ action: "RESOLVE" });
    expect(screen.getByRole("heading", { name: "RESOLVE" })).toBeInTheDocument();
  });

  describe("comment field", () => {
    it("marks the comment field required and blocks submission without one for a comment-required action", async () => {
      const user = userEvent.setup();
      renderDialog({ action: "RESOLVE" });

      expect(screen.getByText(/^Comments/).textContent).toContain("*");

      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(await screen.findByText("Please enter a comment")).toBeInTheDocument();
      expect(updateIncidentAction).not.toHaveBeenCalled();
    });

    it("does not mark the comment field required for a comment-optional action, and submits with it left blank", async () => {
      const user = userEvent.setup();
      renderDialog({ action: "REASSIGN" });

      expect(screen.getByText(/^Comments/).textContent).not.toContain("*");

      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => expect(updateIncidentAction).toHaveBeenCalledTimes(1));
      expect(updateIncidentAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: "REASSIGN", comments: "" }),
      );
    });

    it("shows a live character counter for the comment field", async () => {
      const user = userEvent.setup();
      renderDialog({ action: "RESOLVE" });

      await user.type(screen.getByPlaceholderText("Describe the issue in detail..."), "hello");

      expect(screen.getByText(`5/${MAX_COMMENT_LENGTH}`)).toBeInTheDocument();
    });

    it("blocks submission when the comment exceeds the max length", async () => {
      const user = userEvent.setup();
      renderDialog({ action: "REASSIGN" });

      const textarea = screen.getByPlaceholderText("Describe the issue in detail...");
      // maxLength on the textarea blocks typing past the limit natively, so set the
      // value directly to exercise the dialog's own defensive length validation.
      fireEvent.change(textarea, { target: { value: "a".repeat(MAX_COMMENT_LENGTH + 1) } });

      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(
        await screen.findByText(`Comments cannot exceed ${MAX_COMMENT_LENGTH} characters.`),
      ).toBeInTheDocument();
      expect(updateIncidentAction).not.toHaveBeenCalled();
    });
  });

  describe("documents field", () => {
    it("marks the quotation document field required and blocks submission without one, for a quotation-required action", async () => {
      const user = userEvent.setup();
      renderDialog({ action: "OUT_OF_WARRANTY" });

      expect(screen.getByText(/^Quotation document/).textContent).toContain("*");

      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(await screen.findByText("Please upload a quotation document")).toBeInTheDocument();
      expect(updateIncidentAction).not.toHaveBeenCalled();
    });

    it("does not mark the upload field required, and shows the generic label, for a documents-optional action", () => {
      renderDialog({ action: "RESOLVE" });

      expect(screen.getByText(/^Upload Files/).textContent).not.toContain("*");
    });

    it("renders no documents field at all for a documents-none action", () => {
      renderDialog({ action: "DECLINE_POC" });

      expect(screen.queryByText(/^Upload Files/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Quotation document/)).not.toBeInTheDocument();
    });

    it("rejects a quotation upload that isn't a document format", async () => {
      // applyAccept: false — the file's own name/type must fail the dialog's
      // validation, not just get silently filtered out by the input's `accept`.
      const user = userEvent.setup({ applyAccept: false });
      const { container } = renderDialog({ action: "OUT_OF_WARRANTY" });

      const image = new File(["x"], "photo.png", { type: "image/png" });
      await user.upload(fileInput(container), image);

      expect(
        await screen.findByText("Quotation must be a document (PDF or Word), not an image"),
      ).toBeInTheDocument();
      expect(uploadIncidentFile).not.toHaveBeenCalled();
    });

    it("rejects a quotation upload that exceeds the size limit", async () => {
      const user = userEvent.setup();
      const { container } = renderDialog({ action: "OUT_OF_WARRANTY" });

      const oversized = new File(["x"], "quote.pdf", { type: "application/pdf" });
      Object.defineProperty(oversized, "size", { value: (MAX_QUOTATION_SIZE_MB + 1) * 1024 * 1024 });
      await user.upload(fileInput(container), oversized);

      expect(
        await screen.findByText(`quote.pdf exceeds the ${MAX_QUOTATION_SIZE_MB}MB size limit`),
      ).toBeInTheDocument();
      expect(uploadIncidentFile).not.toHaveBeenCalled();
    });

    it("uploads a valid quotation file, lists it, and submits with it", async () => {
      const user = userEvent.setup();
      const { container } = renderDialog({ action: "OUT_OF_WARRANTY" });

      const validFile = new File([new Uint8Array(2048)], "quote.pdf", { type: "application/pdf" });
      await user.upload(fileInput(container), validFile);

      await waitFor(() =>
        expect(uploadIncidentFile).toHaveBeenCalledWith(validFile, "tenant-1", "token-1"),
      );
      expect(await screen.findByText("quote.pdf")).toBeInTheDocument();
      expect(screen.getByText("2 KB")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => expect(updateIncidentAction).toHaveBeenCalledTimes(1));
      expect(updateIncidentAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "OUT_OF_WARRANTY",
          documents: [expect.objectContaining({ fileStoreId: "fs-1", documentType: "PDF" })],
        }),
      );
    });

    it("removes an uploaded file when its remove control is clicked", async () => {
      const user = userEvent.setup();
      const { container } = renderDialog({ action: "OUT_OF_WARRANTY" });

      const validFile = new File([new Uint8Array(10)], "quote.pdf", { type: "application/pdf" });
      await user.upload(fileInput(container), validFile);
      expect(await screen.findByText("quote.pdf")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Remove" }));

      expect(screen.queryByText("quote.pdf")).not.toBeInTheDocument();
    });

    it("rejects uploading more images than the max allowed for a non-quotation action", async () => {
      const user = userEvent.setup();
      const { container } = renderDialog({ action: "RESOLVE" });

      const files = Array.from(
        { length: MAX_IMAGE_COUNT + 1 },
        (_, index) => new File(["x"], `photo-${index}.png`, { type: "image/png" }),
      );
      await user.upload(fileInput(container), files);

      // The same hint text is always shown below the dropzone, so the error (in a
      // dedicated destructive-colored paragraph) is a second, separate match.
      await waitFor(() =>
        expect(screen.getAllByText(`You can upload up to ${MAX_IMAGE_COUNT} files`)).toHaveLength(2),
      );
      expect(uploadIncidentFile).not.toHaveBeenCalled();
    });
  });

  describe("reason master (DECLINE_POC)", () => {
    it("fetches reason options and filters out inactive ones, blocking submission until one is selected", async () => {
      vi.mocked(fetchReasonOptions).mockResolvedValue({
        RejectReasons: [
          { code: "NOT_APPLICABLE", active: true },
          { code: "RETIRED_REASON", active: false },
        ],
      });
      const user = userEvent.setup();
      renderDialog({ action: "DECLINE_POC" });

      await waitFor(() =>
        expect(fetchReasonOptions).toHaveBeenCalledWith("token-1", authedUser, ["RejectReasons"]),
      );

      const trigger = selectTriggerFor("Decline reason");
      await user.click(trigger);
      expect(screen.getByText("NOT_APPLICABLE")).toBeInTheDocument();
      expect(screen.queryByText("RETIRED_REASON")).not.toBeInTheDocument();

      await user.click(screen.getByText("NOT_APPLICABLE"));
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => expect(updateIncidentAction).toHaveBeenCalledTimes(1));
      expect(updateIncidentAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DECLINE_POC",
          declineReason: expect.objectContaining({ code: "NOT_APPLICABLE" }),
        }),
      );
    });

    it("blocks submission when no reason is selected", async () => {
      vi.mocked(fetchReasonOptions).mockResolvedValue({
        RejectReasons: [{ code: "NOT_APPLICABLE", active: true }],
      });
      const user = userEvent.setup();
      renderDialog({ action: "DECLINE_POC" });

      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(await screen.findByText("Please select a reason")).toBeInTheDocument();
      expect(updateIncidentAction).not.toHaveBeenCalled();
    });
  });

  describe("vendor assignee (ASSIGN_VENDOR)", () => {
    it("fetches vendor options for the ticket's boundary, excluding the given vendor uuid", async () => {
      vi.mocked(fetchVendorOptions).mockResolvedValue([
        { code: "vendor-1", name: "Vendor One" },
        { code: "vendor-2", name: "Vendor Two" },
      ]);
      const user = userEvent.setup();
      renderDialog({ action: "ASSIGN_VENDOR", excludeVendorUuid: "vendor-2" });

      await waitFor(() =>
        expect(fetchVendorOptions).toHaveBeenCalledWith("token-1", authedUser, "BOUNDARY_1"),
      );

      await user.click(selectTriggerFor("Assign to vendor"));
      expect(screen.getByText("Vendor One")).toBeInTheDocument();
      expect(screen.queryByText("Vendor Two")).not.toBeInTheDocument();
    });

    it("blocks submission until a vendor is selected, then submits with the chosen vendor's uuid", async () => {
      vi.mocked(fetchVendorOptions).mockResolvedValue([{ code: "vendor-1", name: "Vendor One" }]);
      const user = userEvent.setup();
      renderDialog({ action: "ASSIGN_VENDOR" });

      await user.click(screen.getByRole("button", { name: "Submit" }));
      expect(await screen.findByText("Please select a vendor")).toBeInTheDocument();
      expect(updateIncidentAction).not.toHaveBeenCalled();

      await user.click(selectTriggerFor("Assign to vendor"));
      await user.click(screen.getByText("Vendor One"));
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => expect(updateIncidentAction).toHaveBeenCalledTimes(1));
      expect(updateIncidentAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: "ASSIGN_VENDOR", assigneeUuid: "vendor-1" }),
      );
    });

    it("shows an error banner when vendor options fail to load", async () => {
      vi.mocked(fetchVendorOptions).mockRejectedValue(new Error("network error"));
      renderDialog({ action: "ASSIGN_VENDOR" });

      expect(
        await screen.findByText("Could not load vendors. Please try again."),
      ).toBeInTheDocument();
    });

    it("does not fetch vendor options when the ticket has no boundary code", () => {
      renderDialog({
        action: "ASSIGN_VENDOR",
        complaintDetails: defaultComplaintDetails({ boundaryCode: undefined }),
      });

      expect(fetchVendorOptions).not.toHaveBeenCalled();
    });
  });

  describe("out-of-warranty helper text", () => {
    it("shows the helper text with the reporter's name for OUT_OF_WARRANTY", () => {
      renderDialog({
        action: "OUT_OF_WARRANTY",
        complaintDetails: defaultComplaintDetails({ reporter: { name: "Jane Reporter" } }),
      });

      expect(
        screen.getByText(
          "By marking this ticket as Out of Warranty, you are expected to contact Jane Reporter and resolve the issue through the appropriate offline process.",
        ),
      ).toBeInTheDocument();
    });

    it("falls back to a generic 'the end user' when there is no reporter name", () => {
      renderDialog({
        action: "OUT_OF_WARRANTY",
        complaintDetails: defaultComplaintDetails({ reporter: undefined }),
      });

      expect(screen.getByText(/the end user/)).toBeInTheDocument();
    });

    it("shows no helper text for an action other than OUT_OF_WARRANTY", () => {
      renderDialog({ action: "RESOLVE" });

      expect(screen.queryByText(/Out of Warranty/)).not.toBeInTheDocument();
    });
  });

  describe("submission outcome", () => {
    it("calls onComplete after a successful submission", async () => {
      const user = userEvent.setup();
      const { onComplete } = renderDialog({ action: "REASSIGN" });

      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    });

    it("shows the backend's error message when the response has no IncidentWrappers", async () => {
      vi.mocked(updateIncidentAction).mockResolvedValue({
        Errors: [{ message: "Ticket already resolved" }],
      });
      const user = userEvent.setup();
      const { onComplete } = renderDialog({ action: "REASSIGN" });

      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(await screen.findByText("Ticket already resolved")).toBeInTheDocument();
      expect(onComplete).not.toHaveBeenCalled();
    });

    it("falls back to the response's top-level message when there are no Errors", async () => {
      vi.mocked(updateIncidentAction).mockResolvedValue({ message: "Could not update ticket" });
      const user = userEvent.setup();
      renderDialog({ action: "REASSIGN" });

      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(await screen.findByText("Could not update ticket")).toBeInTheDocument();
    });

    it("falls back to a generic message when the response has neither Errors nor a message", async () => {
      vi.mocked(updateIncidentAction).mockResolvedValue({});
      const user = userEvent.setup();
      renderDialog({ action: "REASSIGN" });

      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(await screen.findByText("Something went wrong!")).toBeInTheDocument();
    });

    it("shows Submitting... and disables the submit button while the mutation is pending", async () => {
      let resolveUpdate!: (value: Awaited<ReturnType<typeof updateIncidentAction>>) => void;
      vi.mocked(updateIncidentAction).mockReturnValue(
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
      );
      const user = userEvent.setup();
      renderDialog({ action: "REASSIGN" });

      await user.click(screen.getByRole("button", { name: "Submit" }));

      const pendingButton = await screen.findByRole("button", { name: "Submitting..." });
      expect(pendingButton).toBeDisabled();

      resolveUpdate({ IncidentWrappers: [{ incident: {}, workflow: {} } as never] });
      await waitFor(() => expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled());
    });
  });

  describe("closing the dialog", () => {
    it("calls onClose when Cancel is clicked", async () => {
      const user = userEvent.setup();
      const { onClose } = renderDialog({ action: "RESOLVE" });

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when the overlay background is clicked", async () => {
      const user = userEvent.setup();
      const { onClose } = renderDialog({ action: "RESOLVE" });

      await user.click(screen.getByRole("button", { name: "Close" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose when clicking inside the dialog content", async () => {
      const user = userEvent.setup();
      const { onClose } = renderDialog({ action: "RESOLVE" });

      await user.click(screen.getByRole("heading", { name: "RESOLVE" }));

      expect(onClose).not.toHaveBeenCalled();
    });

    it("calls onClose when Escape is pressed inside the dialog content", () => {
      const { onClose } = renderDialog({ action: "RESOLVE" });

      fireEvent.keyDown(screen.getByPlaceholderText("Describe the issue in detail..."), {
        key: "Escape",
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
