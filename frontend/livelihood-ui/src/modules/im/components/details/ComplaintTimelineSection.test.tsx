/**
 * Unit tests for ComplaintTimelineSection.
 *
 * Covers the timeline rendering behaviour of ComplaintTimelineSection and its
 * internal TimelineCaption helper: empty-state bail-out, one rendered entry
 * per checkpoint, comment/attachment/assigner rendering rules, and the
 * reversed-array "most recent reason" logic used for OUT_OF_SCOPE and
 * DECLINE_POC checkpoints.
 *
 * Testing approach:
 * - The component calls useTranslate()/translateOr() for copy, so every render
 *   is wrapped in a real (not mocked) I18nextProvider backed by an empty
 *   in-memory i18next instance. With no translation resources loaded,
 *   translateOr falls back to the fallback string passed at each call site,
 *   which is what the assertions below match against (e.g. "APPLY",
 *   "Attachments") rather than translation keys.
 * - ComplaintTimelineSection also renders ComplaintActionBar, which relies on
 *   react-query, so a QueryClientProvider wrapper is required even though
 *   these tests don't assert on that component directly.
 * - No network/data mocking is needed beyond the builder helpers below
 *   (buildIncident/buildComplaintDetails), which construct minimal valid
 *   fixtures and let each test override just the fields it cares about.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type {
  ComplaintDetailsData,
  Incident,
  WorkflowDetailsData,
  WorkflowTimelineCheckpoint,
} from "../../types/incident-details";
import { ComplaintTimelineSection } from "./ComplaintTimelineSection";

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

function renderSection(timeline: WorkflowTimelineCheckpoint[], complaintDetails?: ComplaintDetailsData) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const workflowDetails: WorkflowDetailsData = { timeline, nextActions: [], processInstances: [] };
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <QueryClientProvider client={queryClient}>
        <ComplaintTimelineSection
          timeline={timeline}
          complaintDetails={complaintDetails ?? buildComplaintDetails()}
          workflowDetails={workflowDetails}
          onActionComplete={vi.fn().mockResolvedValue(undefined)}
        />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

// ComplaintTimelineSection renders one <li> per WorkflowTimelineCheckpoint (short-circuiting to
// null when the timeline array is empty), plus a ComplaintActionBar below the list. Checkpoint
// index 0 is treated as the most recent action (styled/highlighted as "latest") because callers
// pass `processInstances[0]` first; each checkpoint's caption is delegated to the internal
// TimelineCaption helper, which derives reason text (OUT_OF_SCOPE/DECLINE_POC), comments,
// assigner details, and attachments (suppressed for CREATE/APPLY checkpoints) from the
// checkpoint plus the wider ComplaintDetailsData.incident.additionalDetail.
describe("ComplaintTimelineSection", () => {
  it("renders nothing when the timeline is empty", () => {
    const { container } = renderSection([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one entry per timeline checkpoint", () => {
    renderSection([{ performedAction: "APPLY" }, { performedAction: "RESOLVE" }]);
    expect(screen.getByText("APPLY")).toBeInTheDocument();
    expect(screen.getByText("RESOLVE")).toBeInTheDocument();
  });

  it("renders comments attached to a checkpoint", () => {
    renderSection([{ performedAction: "RESOLVE", wfComment: ["All fixed now"] }]);
    expect(screen.getByText("All fixed now")).toBeInTheDocument();
  });

  it("shows the out-of-scope reason using the last (most recent) reason via the reversed array", () => {
    renderSection(
      [{ performedAction: "OUT_OF_SCOPE" }],
      buildComplaintDetails({
        incident: buildIncident({
          additionalDetail: { outOfScopeReason: ["FIRST_REASON", "SECOND_REASON"] },
        }),
      }),
    );
    // Reversed array's shift() pulls "SECOND_REASON" first (the most recently pushed).
    expect(screen.getByText("SECOND_REASON")).toBeInTheDocument();
  });

  // Same reversed-array/shift() "most recently added reason" mechanism as OUT_OF_SCOPE above,
  // but exercised against declineReason instead of outOfScopeReason to confirm the DECLINE_POC
  // branch reads from the correct field.
  it("shows the decline reason for a DECLINE_POC checkpoint", () => {
    renderSection(
      [{ performedAction: "DECLINE_POC" }],
      buildComplaintDetails({
        incident: buildIncident({ additionalDetail: { declineReason: ["NOT_APPLICABLE"] } }),
      }),
    );
    expect(screen.getByText("NOT_APPLICABLE")).toBeInTheDocument();
  });

  // Business rule: `isCreateCheckpoint` (action === "APPLY" || "CREATE") unconditionally hides
  // the attachments block in TimelineCaption, even when thumbnailsToShow has images/videos —
  // creation checkpoints aren't expected to carry attachments in the UI.
  it("does not show attachments for a CREATE/APPLY checkpoint even if media is present", () => {
    renderSection([
      {
        performedAction: "APPLY",
        thumbnailsToShow: { fullImage: ["https://cdn/img.jpg"] },
      },
    ]);
    expect(screen.queryByText("Attachments")).not.toBeInTheDocument();
  });

  it("shows attachments for a non-create checkpoint with media", () => {
    renderSection([
      {
        performedAction: "RESOLVE",
        thumbnailsToShow: { fullImage: ["https://cdn/img.jpg"] },
      },
    ]);
    expect(screen.getByText("Attachments")).toBeInTheDocument();
  });

  it("renders assigner name and mobile number when present", () => {
    renderSection([
      {
        performedAction: "REASSIGN",
        assigner: { name: "Jane Doe", mobileNumber: "9999999999" },
      },
    ]);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("9999999999")).toBeInTheDocument();
  });
});
