/**
 * Unit tests for ComplaintActionDialog.
 *
 * ComplaintActionDialog renders a modal that lets a user act on a complaint
 * (e.g. RESOLVE, DECLINE_POC, OUT_OF_SCOPE, OUT_OF_WARRANTY). Its behaviour
 * branches on the per-action config returned by getWorkflowActionConfig:
 *  - whether a comment is required and capped at MAX_COMMENT_LENGTH,
 *  - whether a reason must be picked from an MDMS-backed dropdown
 *    (fetched via fetchReasonOptions),
 *  - whether supporting documents/a quotation must be uploaded
 *    (via uploadIncidentFile, with quotation-specific format/size rules),
 *  - and it renders nothing at all for actions unknown to the workflow config.
 * On submit it validates client-side, calls updateIncidentAction, and either
 * surfaces a translated/business error or invokes onComplete on success.
 *
 * Testing approach:
 *  - The dialog is rendered inside a real QueryClientProvider (useMutation
 *    needs one) and a real I18nextProvider seeded with empty translation
 *    resources, so translateOr's English fallback strings are what actually
 *    render and can be asserted on directly.
 *  - seedAuthenticatedSession/resetAuthStore stub the auth store so the
 *    component sees a logged-in user + access token without a real login flow.
 *  - workflowService.fetchReasonOptions and workflowService.updateIncidentAction
 *    (and fileUploadService.uploadIncidentFile) are spied on per test to
 *    control server responses without hitting the network.
 *  - A couple of tests deliberately bypass `userEvent` and use `fireEvent`
 *    directly where userEvent's real-browser-like behavior (respecting the
 *    textarea's maxLength or the file input's accept filter) would prevent
 *    the invalid input from ever reaching the component's own validation
 *    logic — see the inline comments on those tests.
 */
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

// ComplaintActionDialog: a modal for actioning a complaint (RESOLVE,
// DECLINE_POC, OUT_OF_SCOPE, OUT_OF_WARRANTY, ...). It looks up the action's
// config via getWorkflowActionConfig to decide which fields (reason,
// comment, documents) are shown/required, runs client-side validation in
// its useMutation mutationFn, and calls updateIncidentAction to submit.
// Preconditions: an authenticated user + accessToken (via useAuthStore) and
// a ComplaintDetailsData describing the incident being actioned.
describe("ComplaintActionDialog", () => {
  // getWorkflowActionConfig(action) returns undefined for actions the
  // workflow config doesn't know about, and the component short-circuits to
  // `return null` in that case, so nothing should render.
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

  // RESOLVE's action config marks the comment field as "required", so the
  // mutationFn throws COMMENT_REQUIRED when comments.trim() is empty, and
  // onError maps that code to the translated "Please enter a comment" text.
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

  // Happy path: a valid comment satisfies validation, updateIncidentAction
  // resolves with an IncidentWrappers payload (the "success" shape the
  // component checks for in onSuccess), so onComplete should fire.
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

  // When the API responds without an IncidentWrappers array, onSuccess treats
  // it as a business failure (not a thrown error) and surfaces
  // response.Errors[0].message directly instead of a generic error string.
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

  // DECLINE_POC's config has a reasonMaster, which both renders the reason
  // FormSelectField (populated from fetchReasonOptions's "RejectReasons" key,
  // matching the master name in the action config) and makes selecting a
  // reason mandatory: submitting without one throws REASON_REQUIRED.
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

  // OUT_OF_WARRANTY's config marks documents as "required" (and
  // isQuotationRequiredAction treats it as a quotation upload), so submitting
  // with zero uploads throws FILES_REQUIRED, which maps to the
  // "Please upload a quotation document" message.
  it("requires a document upload for OUT_OF_WARRANTY", async () => {
    const user = userEvent.setup();
    renderDialog({ action: "OUT_OF_WARRANTY" });

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(screen.getByText("Please upload a quotation document")).toBeInTheDocument(),
    );
  });

  // getOutOfWarrantyHelperText only produces text for the OUT_OF_WARRANTY
  // action, and interpolates the reporter's name (falling back to
  // "the end user" when absent) into the translated helper string.
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

  // A PDF passes validateQuotationFiles's format/size checks, so handleUpload
  // calls uploadIncidentFile and adds the resulting entry to `uploads`,
  // which ActionDocumentsField then renders by file name.
  it("uploads a valid quotation file", async () => {
    const user = userEvent.setup();
    vi.spyOn(fileUploadService, "uploadIncidentFile").mockResolvedValue({ fileStoreId: "fs-1" });
    renderDialog({ action: "OUT_OF_WARRANTY" });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, buildFile("quote.pdf", 10, "application/pdf"));

    await waitFor(() => expect(screen.getByText("quote.pdf")).toBeInTheDocument());
  });

  // handleRemoveUpload filters the uploads array by index, so after removing
  // the only uploaded file its name should no longer be in the document.
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
