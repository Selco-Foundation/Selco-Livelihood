/**
 * Unit tests for ComplaintActionBar.
 *
 * Covers the visibility/gating logic (hidden when closed or no supported
 * next actions), the single-action-vs-split-button rendering branch, the
 * end-user REOPEN cap (MAX_END_USER_REOPEN_COUNT), and that clicking an
 * action opens the ComplaintActionDialog.
 *
 * Testing approach:
 * - Renders with real QueryClientProvider/I18nextProvider wrappers (rather
 *   than mocking them) because the component and its children read
 *   translations via useTranslate/react-i18next and rely on react-query
 *   context being present; a bare, empty i18n instance is created per test
 *   so translateOr's fallback strings are exercised (see
 *   translations: {} below), which is why button labels assert on the
 *   English fallback text (e.g. "RESOLVE", "Take action") rather than
 *   translated keys.
 * - The auth store is not mocked with vi.mock; instead the real store is
 *   seeded/reset via seedAuthenticatedSession/resetAuthStore test helpers
 *   so role-based logic (isEndUser) runs against real store state.
 * - No mocking of ComplaintActionDialog: it's asserted on indirectly via
 *   its dialog role appearing after a click.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import type {
  ComplaintDetailsData,
  Incident,
  WorkflowDetailsData,
} from "../../types/incident-details";
import { ComplaintActionBar } from "./ComplaintActionBar";

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

function buildWorkflowDetails(overrides: Partial<WorkflowDetailsData> = {}): WorkflowDetailsData {
  return {
    timeline: [],
    nextActions: [],
    processInstances: [],
    ...overrides,
  };
}

function renderBar(props: {
  complaintDetails?: ComplaintDetailsData;
  workflowDetails?: WorkflowDetailsData;
  onActionComplete?: () => Promise<void>;
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <QueryClientProvider client={queryClient}>
        <ComplaintActionBar
          complaintDetails={props.complaintDetails ?? buildComplaintDetails()}
          workflowDetails={props.workflowDetails ?? buildWorkflowDetails()}
          onActionComplete={props.onActionComplete ?? vi.fn().mockResolvedValue(undefined)}
        />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

afterEach(() => {
  resetAuthStore();
});

// ComplaintActionBar (source: ComplaintActionBar.tsx) decides whether to show
// a "take action" control for a complaint, and in what shape:
// - It is hidden entirely (`showActions` false) when the ticket is already
//   closed (isClosedTicket) or when there are zero `availableActions` left
//   after filtering `workflowDetails.nextActions` down to
//   SUPPORTED_WORKFLOW_ACTION_SET and, for end users, capping REOPEN.
// - With exactly one available action it renders a single Button that opens
//   the ComplaintActionDialog directly.
// - With more than one it renders a SplitButton whose label toggles a
//   dropdown menu of the remaining actions (each also opening the dialog).
// - REOPEN is specifically hidden for end users (isEndUser(user?.roles))
//   once they have already reopened MAX_END_USER_REOPEN_COUNT (2) times,
//   counted from `workflowDetails.timeline` entries whose
//   `performedAction === "REOPEN"`; non-end-users are exempt from this cap.
describe("ComplaintActionBar", () => {
  // No nextActions at all means availableActions is empty, so showActions
  // is false and the component must render nothing (not even a wrapper div).
  it("renders nothing when there are no available next actions", () => {
    const { container } = renderBar({ workflowDetails: buildWorkflowDetails({ nextActions: [] }) });
    expect(container).toBeEmptyDOMElement();
  });

  // isClosedTicket(applicationStatus) short-circuits showActions to false
  // regardless of how many actions are otherwise available, so a closed
  // ticket must never show an action bar.
  it("renders nothing when the ticket is already closed, even with available actions", () => {
    const { container } = renderBar({
      complaintDetails: buildComplaintDetails({
        incident: buildIncident({ applicationStatus: "CLOSED_AFTER_RESOLUTION" }),
      }),
      workflowDetails: buildWorkflowDetails({ nextActions: [{ action: "RESOLVE" }] }),
    });
    expect(container).toBeEmptyDOMElement();
  });

  // Only actions present in SUPPORTED_WORKFLOW_ACTION_SET are kept; an
  // action outside that set leaves availableActions empty, so no button
  // (single-action or split) should render.
  it("filters out unsupported workflow actions", () => {
    renderBar({
      workflowDetails: buildWorkflowDetails({ nextActions: [{ action: "SOME_UNSUPPORTED_ACTION" }] }),
    });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  // availableActions.length === 1 takes the singleAction branch, rendering
  // a plain Button labelled with the (fallback) translated action name
  // instead of the SplitButton/menu branch.
  it("renders a single action button directly when only one action is available", () => {
    renderBar({ workflowDetails: buildWorkflowDetails({ nextActions: [{ action: "RESOLVE" }] }) });
    expect(screen.getByRole("button", { name: "RESOLVE" })).toBeInTheDocument();
  });

  // More than one available action takes the SplitButton branch: clicking
  // the "Take action" label toggles menuOpen, revealing a button per action.
  it("renders a split-button with a menu when multiple actions are available", async () => {
    const user = userEvent.setup();
    renderBar({
      workflowDetails: buildWorkflowDetails({
        nextActions: [{ action: "RESOLVE" }, { action: "REASSIGN" }],
      }),
    });

    const splitButtonLabel = screen.getByRole("button", { name: "Take action" });
    expect(splitButtonLabel).toBeInTheDocument();
    await user.click(splitButtonLabel);

    expect(screen.getByRole("button", { name: "RESOLVE" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "REASSIGN" })).toBeInTheDocument();
  });

  // Business rule: an EMPLOYEE role counts as an end user (isEndUser), and
  // the timeline already has 2 REOPEN checkpoints (== MAX_END_USER_REOPEN_COUNT),
  // so the reopen limit is reached and REOPEN must be pruned from
  // availableActions while other actions (RESOLVE) remain untouched.
  it("hides the REOPEN action for an end user who has already reopened the max number of times", () => {
    seedAuthenticatedSession({ roles: [{ code: "EMPLOYEE" }] });
    renderBar({
      workflowDetails: buildWorkflowDetails({
        nextActions: [{ action: "REOPEN" }, { action: "RESOLVE" }],
        timeline: [
          { performedAction: "REOPEN" },
          { performedAction: "REOPEN" },
          { performedAction: "APPLY" },
        ],
      }),
    });

    expect(screen.queryByRole("button", { name: "REOPEN" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "RESOLVE" })).toBeInTheDocument();
  });

  // The reopen cap only applies when isEndUser(user?.roles) is true; a
  // COMPLAINT_RESOLVER role is not an end user, so REOPEN must stay
  // available even with the same (or more) reopen count as the capped case.
  it("still allows REOPEN for a non-end-user even after multiple reopens", () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINT_RESOLVER" }] });
    renderBar({
      workflowDetails: buildWorkflowDetails({
        nextActions: [{ action: "REOPEN" }],
        timeline: [{ performedAction: "REOPEN" }, { performedAction: "REOPEN" }],
      }),
    });

    expect(screen.getByRole("button", { name: "REOPEN" })).toBeInTheDocument();
  });

  // Clicking the single-action Button sets selectedAction, which mounts
  // ComplaintActionDialog (rendered, not mocked); its presence is asserted
  // indirectly via the "dialog" role rather than inspecting dialog internals.
  it("opens the action dialog when the single action button is clicked", async () => {
    const user = userEvent.setup();
    renderBar({ workflowDetails: buildWorkflowDetails({ nextActions: [{ action: "RESOLVE" }] }) });

    await user.click(screen.getByRole("button", { name: "RESOLVE" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
