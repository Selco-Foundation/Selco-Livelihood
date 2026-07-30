import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { buildFile } from "@/test/mocks/file";
import * as fileUploadService from "../../services/file-upload";
import * as workflowService from "../../services/workflow";
import type { ComplaintDetailsData, Incident } from "../../types/incident-details";
import { ComplaintActionDialog } from "./ComplaintActionDialog";

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

function buildIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    tenantId: "livelihood",
    incidentId: "INC-1",
    applicationStatus: "PENDING_FOR_RESOLUTION",
    incidentType: "streetlight",
    incidentSubType: "not-working",
    ...overrides,
  };
}

function buildComplaintDetails(overrides: Partial<ComplaintDetailsData> = {}): ComplaintDetailsData {
  return {
    incidentId: "INC-1",
    tenantId: "livelihood",
    rows: [],
    incident: buildIncident(),
    workflow: {},
    images: [],
    videos: [],
    thumbnails: [],
    ...overrides,
  };
}

function renderDialog(props: {
  action: string;
  complaintDetails?: ComplaintDetailsData;
  onClose?: () => void;
  onComplete?: () => Promise<void>;
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <QueryClientProvider client={queryClient}>
        <ComplaintActionDialog
          action={props.action}
          complaintDetails={props.complaintDetails ?? buildComplaintDetails()}
          onClose={props.onClose ?? vi.fn()}
          onComplete={props.onComplete ?? vi.fn().mockResolvedValue(undefined)}
        />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  seedAuthenticatedSession();
  vi.spyOn(workflowService, "fetchReasonOptions").mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
});

describe("ComplaintActionDialog", () => {
  it("renders nothing for an unsupported action", () => {
    const { container } = renderDialog({ action: "MADE_UP_ACTION" });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the action name as the dialog title", () => {
    renderDialog({ action: "RESOLVE" });
    expect(screen.getByRole("heading", { name: "RESOLVE" })).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ action: "RESOLVE", onClose });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a required-comment error when submitting RESOLVE with no comment", async () => {
    const user = userEvent.setup();
    renderDialog({ action: "RESOLVE" });

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(screen.getByText("Please enter a comment")).toBeInTheDocument(),
    );
  });

  it("shows a max-length error when the comment exceeds the limit", async () => {
    const user = userEvent.setup();
    renderDialog({ action: "RESOLVE" });

    // The textarea's own maxLength=1000 attribute blocks userEvent.type from
    // ever exceeding the limit (it simulates real browser input constraints),
    // so fireEvent.change is used to set an over-length value directly and
    // exercise the COMMENT_TOO_LONG validation branch in the mutation.
    const textarea = document.querySelector("textarea")!;
    fireEvent.change(textarea, { target: { value: "a".repeat(1001) } });

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(
        screen.getByText("Comments cannot exceed 1000 characters."),
      ).toBeInTheDocument(),
    );
  });

  it("submits successfully and calls onComplete", async () => {
    const user = userEvent.setup();
    vi.spyOn(workflowService, "updateIncidentAction").mockResolvedValue({
      IncidentWrappers: [{ incident: { incidentId: "INC-1" } }],
    });
    const onComplete = vi.fn().mockResolvedValue(undefined);
    renderDialog({ action: "RESOLVE", onComplete });

    await user.type(document.querySelector("textarea")!, "Fixed the issue");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("shows the response's error message when the submission response has no IncidentWrappers", async () => {
    const user = userEvent.setup();
    vi.spyOn(workflowService, "updateIncidentAction").mockResolvedValue({
      Errors: [{ message: "Ticket already resolved" }],
    });
    renderDialog({ action: "RESOLVE" });

    await user.type(document.querySelector("textarea")!, "Fixed the issue");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(screen.getByText("Ticket already resolved")).toBeInTheDocument(),
    );
  });

  it("shows a reason selector for DECLINE_POC and requires a reason before submitting", async () => {
    const user = userEvent.setup();
    vi.spyOn(workflowService, "fetchReasonOptions").mockResolvedValue({
      RejectReasons: [{ code: "NOT_APPLICABLE", active: true }],
    });
    renderDialog({ action: "DECLINE_POC" });

    await waitFor(() => expect(screen.getByText("Decline reason")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(screen.getByText("Please select a reason")).toBeInTheDocument());
  });

  it("requires a document upload for OUT_OF_WARRANTY", async () => {
    const user = userEvent.setup();
    renderDialog({ action: "OUT_OF_WARRANTY" });

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(screen.getByText("Please upload a quotation document")).toBeInTheDocument(),
    );
  });

  it("shows the out-of-warranty helper text", () => {
    renderDialog({
      action: "OUT_OF_WARRANTY",
      complaintDetails: buildComplaintDetails({
        incident: buildIncident({ reporter: { name: "Jane Doe" } }),
      }),
    });
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
  });

  it("rejects a quotation upload with a disallowed format", async () => {
    renderDialog({ action: "OUT_OF_WARRANTY" });

    // user-event's upload() silently filters files against the input's own
    // `accept` attribute (real-browser-like), so a mismatched file never
    // reaches the change handler that way. fireEvent bypasses that filtering
    // to actually exercise the component's own format validation.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [buildFile("photo.jpg", 10, "image/jpeg")] } });

    await waitFor(() =>
      expect(
        screen.getByText("Quotation must be a document (PDF or Word), not an image"),
      ).toBeInTheDocument(),
    );
  });

  it("uploads a valid quotation file", async () => {
    const user = userEvent.setup();
    vi.spyOn(fileUploadService, "uploadIncidentFile").mockResolvedValue({ fileStoreId: "fs-1" });
    renderDialog({ action: "OUT_OF_WARRANTY" });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, buildFile("quote.pdf", 10, "application/pdf"));

    await waitFor(() => expect(screen.getByText("quote.pdf")).toBeInTheDocument());
  });

  it("removes an uploaded file when its remove button is clicked", async () => {
    const user = userEvent.setup();
    vi.spyOn(fileUploadService, "uploadIncidentFile").mockResolvedValue({ fileStoreId: "fs-1" });
    renderDialog({ action: "OUT_OF_WARRANTY" });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, buildFile("quote.pdf", 10, "application/pdf"));
    await waitFor(() => expect(screen.getByText("quote.pdf")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.queryByText("quote.pdf")).not.toBeInTheDocument();
  });
});
