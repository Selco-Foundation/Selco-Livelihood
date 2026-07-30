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

describe("ComplaintActionBar", () => {
  it("renders nothing when there are no available next actions", () => {
    const { container } = renderBar({ workflowDetails: buildWorkflowDetails({ nextActions: [] }) });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the ticket is already closed, even with available actions", () => {
    const { container } = renderBar({
      complaintDetails: buildComplaintDetails({
        incident: buildIncident({ applicationStatus: "CLOSED_AFTER_RESOLUTION" }),
      }),
      workflowDetails: buildWorkflowDetails({ nextActions: [{ action: "RESOLVE" }] }),
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("filters out unsupported workflow actions", () => {
    renderBar({
      workflowDetails: buildWorkflowDetails({ nextActions: [{ action: "SOME_UNSUPPORTED_ACTION" }] }),
    });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a single action button directly when only one action is available", () => {
    renderBar({ workflowDetails: buildWorkflowDetails({ nextActions: [{ action: "RESOLVE" }] }) });
    expect(screen.getByRole("button", { name: "RESOLVE" })).toBeInTheDocument();
  });

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

  it("opens the action dialog when the single action button is clicked", async () => {
    const user = userEvent.setup();
    renderBar({ workflowDetails: buildWorkflowDetails({ nextActions: [{ action: "RESOLVE" }] }) });

    await user.click(screen.getByRole("button", { name: "RESOLVE" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
