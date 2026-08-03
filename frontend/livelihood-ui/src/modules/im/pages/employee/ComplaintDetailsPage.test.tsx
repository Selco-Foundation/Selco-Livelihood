/**
 * Unit tests for ComplaintDetailsPage (src/modules/im/pages/employee/ComplaintDetailsPage.tsx).
 *
 * Covers:
 *  - `useComplaintRouteParams` (inlined in the page module): parses `incidentId`/`tenantId`
 *    out of `window.location.pathname` by locating the "details" segment. Exercised
 *    indirectly through the page's early-return branch, since the hook itself isn't
 *    exported.
 *  - `ComplaintDetailsPage`'s branch order: missing route params -> loading -> error
 *    (isError or missing complaint/workflow data) -> success.
 *  - The `applyCheckpoint` lookup that picks media to display: the timeline's
 *    AUTO_ASSIGN/CREATE checkpoint's `thumbnailsToShow` takes precedence over the
 *    complaint's own `images`/`videos` when present, and the complaint's own media is
 *    used otherwise.
 *  - `handleActionComplete` wiring: submitting a workflow action through the real child
 *    component tree (ComplaintTimelineSection -> ComplaintActionBar -> ComplaintActionDialog)
 *    calls `useComplaintDetails().revalidate()`, which invalidates and refetches the
 *    complaint/workflow queries so the page reflects the server's post-action state.
 *
 * Mocking strategy: the page composes a real `useComplaintDetails` hook (already unit
 * tested in `use-complaint-details.test.tsx`) with real child section components, so
 * this file mocks only at the API-service boundary via `vi.spyOn` on
 * `services/incident-details` and `services/workflow` (never the hooks themselves),
 * matching the rest of this suite's convention. This lets the real React Query cache,
 * the real `useComplaintDetails` derivation logic, and the real
 * ComplaintTimelineSection/ComplaintActionBar/ComplaintActionDialog components run
 * end-to-end, which is what's needed to prove the action-complete revalidation actually
 * refetches through the query client rather than just calling a stubbed prop.
 *
 * A router + query-client wrapper is required (`renderWithProviders(..., { withRouter: true })`)
 * because the page renders `<Link>` (breadcrumbs, "View inbox") and uses
 * `useComplaintDetails`'s `useQuery`/`useQueryClient`. A lightweight test-only i18next
 * instance (via `renderWithProviders`) stands in for the app's real network-backed i18n
 * provider; with no resources loaded, `translateOr` always falls back to the English
 * default strings baked into the source, which is what tests assert against.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { renderWithProviders } from "@/test/render-with-providers";
import * as incidentDetailsService from "../../services/incident-details";
import * as workflowService from "../../services/workflow";
import type {
  Incident,
  IncidentWorkflow,
  WorkflowDetailsData,
} from "../../types/incident-details";
import { ComplaintDetailsPage } from "./ComplaintDetailsPage";

const VALID_PATH = "/livelihood-ui/employee/im/complaint/details/INC-1/livelihood";

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

function mockIncidentSearch(incident: Incident, workflow: IncidentWorkflow = {}) {
  return vi.spyOn(incidentDetailsService, "searchIncidentById").mockResolvedValue({
    IncidentWrappers: [{ incident, workflow }],
  });
}

function buildWorkflowDetails(overrides: Partial<WorkflowDetailsData> = {}): WorkflowDetailsData {
  return {
    timeline: [],
    nextActions: [],
    processInstances: [],
    ...overrides,
  };
}

/** Navigates jsdom to `path` before mounting; the page reads `window.location.pathname` directly. */
function renderPage(path: string) {
  window.history.pushState({}, "", path);
  return renderWithProviders(<ComplaintDetailsPage />, { withRouter: true });
}

beforeEach(() => {
  resetAuthStore();
  seedAuthenticatedSession();
  // Default: no verification media, so tests that don't care about attachments
  // don't have to stub this on every call.
  vi.spyOn(incidentDetailsService, "resolveVerificationMedia").mockResolvedValue({
    thumbs: [],
    images: [],
    videos: [],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
  window.history.pushState({}, "", "/");
});

// The page derives incidentId/tenantId from window.location.pathname by finding the
// "details" segment (see useComplaintRouteParams). When that lookup can't produce both
// values, the component short-circuits before ever calling useComplaintDetails.
describe("ComplaintDetailsPage route-param parsing", () => {
  it("shows a fallback with a link back to the inbox when the URL has no 'details' segment", async () => {
    renderPage("/livelihood-ui/employee/im/inbox");

    expect(await screen.findByText("Something went wrong!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View inbox" })).toBeInTheDocument();
  });

  it("shows the same fallback when 'details' is present but no incidentId/tenantId follow it", async () => {
    renderPage("/livelihood-ui/employee/im/complaint/details");

    expect(await screen.findByText("Something went wrong!")).toBeInTheDocument();
  });
});

// With valid route params, the page renders useComplaintDetails's loading state
// (complaintQuery.isLoading || workflowQuery.isLoading) as a centered spinner before
// either query has settled.
describe("ComplaintDetailsPage loading state", () => {
  it("shows a loading spinner while the complaint and workflow queries are in flight", async () => {
    // Promises that never resolve keep both queries in their initial pending/fetching
    // state for the life of the test.
    vi.spyOn(incidentDetailsService, "searchIncidentById").mockImplementation(
      () => new Promise(() => {}),
    );
    vi.spyOn(workflowService, "fetchWorkflowDetails").mockImplementation(
      () => new Promise(() => {}),
    );

    renderPage(VALID_PATH);

    await waitFor(() => expect(document.querySelector(".animate-spin")).toBeInTheDocument());
  });
});

// Once loading finishes, an errored query (or a query that settled without producing
// complaintDetails/workflowDetails, e.g. an empty IncidentWrappers array which
// use-complaint-details.ts turns into a thrown/errored query) renders the "not found"
// fallback instead of the ticket UI.
describe("ComplaintDetailsPage error state", () => {
  it("shows a not-found message when the incident search returns no wrapper", async () => {
    vi.spyOn(incidentDetailsService, "searchIncidentById").mockResolvedValue({
      IncidentWrappers: [],
    });
    vi.spyOn(workflowService, "fetchWorkflowDetails").mockResolvedValue(buildWorkflowDetails());

    renderPage(VALID_PATH);

    expect(await screen.findByText("Ticket not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View inbox" })).toBeInTheDocument();
  });
});

// applyCheckpoint = workflowDetails.timeline.find(checkpoint whose performedAction is
// AUTO_ASSIGN or CREATE). When found, its thumbnailsToShow.fullImage/videos are shown
// instead of the complaint's own images/videos; otherwise the complaint's own media is
// used. This is the page's only non-trivial derived-data logic, so it gets its own
// describe block.
describe("ComplaintDetailsPage timeline checkpoint media lookup", () => {
  it("falls back to the complaint's own images when no AUTO_ASSIGN/CREATE checkpoint exists", async () => {
    mockIncidentSearch(buildIncident());
    vi.spyOn(incidentDetailsService, "resolveVerificationMedia").mockResolvedValue({
      thumbs: [],
      images: ["complaint-fallback.jpg"],
      videos: [],
    });
    // A checkpoint exists, but its action ("RESOLVE") isn't AUTO_ASSIGN/CREATE, so
    // `applyCheckpoint` must stay undefined and its thumbnails must be ignored.
    vi.spyOn(workflowService, "fetchWorkflowDetails").mockResolvedValue(
      buildWorkflowDetails({
        timeline: [
          {
            performedAction: "RESOLVE",
            thumbnailsToShow: { fullImage: ["should-not-appear.jpg"] },
          },
        ],
      }),
    );

    renderPage(VALID_PATH);

    // Scoped to the top "Attachments" section (ComplaintMediaSection) rather than the
    // whole page: the RESOLVE checkpoint above legitimately renders its own
    // "should-not-appear.jpg" thumbnail inside the timeline entry's caption
    // (ComplaintTimelineSection's TimelineCaption shows non-create checkpoints' own
    // thumbnails) -- that's correct, unrelated behavior, not the bug this test targets.
    const mediaHeading = await screen.findByRole("heading", { name: "Attachments" });
    const mediaSection = mediaHeading.closest("section")!;
    const images = within(mediaSection).getAllByRole("img");
    expect(images.map((img) => img.getAttribute("src"))).toEqual(["complaint-fallback.jpg"]);
  });

  it("prefers the AUTO_ASSIGN/CREATE checkpoint's thumbnails over the complaint's own images/videos", async () => {
    mockIncidentSearch(buildIncident());
    vi.spyOn(incidentDetailsService, "resolveVerificationMedia").mockResolvedValue({
      thumbs: [],
      images: ["complaint-fallback.jpg"],
      videos: [],
    });
    vi.spyOn(workflowService, "fetchWorkflowDetails").mockResolvedValue(
      buildWorkflowDetails({
        timeline: [
          {
            performedAction: "CREATE",
            thumbnailsToShow: {
              fullImage: ["checkpoint-photo.jpg"],
              videos: [{ original: "checkpoint-video.mp4" }],
            },
          },
        ],
      }),
    );

    renderPage(VALID_PATH);

    const mediaHeading = await screen.findByRole("heading", { name: "Attachments" });
    const mediaSection = mediaHeading.closest("section")!;
    const images = within(mediaSection).getAllByRole("img");
    expect(images.map((img) => img.getAttribute("src"))).toEqual(["checkpoint-photo.jpg"]);
    expect(mediaSection.querySelector("video")).toHaveAttribute(
      "src",
      "checkpoint-video.mp4",
    );
  });
});

// handleActionComplete is an async wrapper around useComplaintDetails().revalidate(),
// passed to ComplaintTimelineSection as onActionComplete. It's only reachable through
// the real child components (ComplaintActionBar renders the action button;
// ComplaintActionDialog performs the submission and calls onComplete), so this test
// drives the full flow rather than calling the page's internal handler directly.
describe("ComplaintDetailsPage action-complete revalidation", () => {
  it("refetches the workflow query after a workflow action completes, hiding the action bar once no actions remain", async () => {
    const user = userEvent.setup();
    mockIncidentSearch(buildIncident());
    // ComplaintTimelineSection (which hosts ComplaintActionBar) renders null when
    // `timeline` is empty, so a non-empty timeline is required for the action bar to
    // appear at all -- independent of nextActions. First fetch: one supported action
    // available, so ComplaintActionBar renders a single-action button. Second fetch
    // (triggered by revalidate()'s invalidateQueries): server reports no more next
    // actions, so the bar must disappear -- this is the observable proof that a real
    // refetch happened, not just that a mock callback fired.
    vi.spyOn(workflowService, "fetchWorkflowDetails")
      .mockResolvedValueOnce(
        buildWorkflowDetails({
          timeline: [{ performedAction: "CREATE" }],
          nextActions: [{ action: "RESOLVE" }],
        }),
      )
      .mockResolvedValueOnce(
        buildWorkflowDetails({ timeline: [{ performedAction: "CREATE" }], nextActions: [] }),
      );
    vi.spyOn(workflowService, "updateIncidentAction").mockResolvedValue({
      IncidentWrappers: [{ incident: { incidentId: "INC-1" } }],
    });

    renderPage(VALID_PATH);

    const actionButton = await screen.findByRole("button", { name: "RESOLVE" });
    await user.click(actionButton);

    // RESOLVE requires a comment (WORKFLOW_ACTION_CONFIG.RESOLVE.comment === "required"),
    // so the dialog's mutation would otherwise reject before ever reaching onComplete.
    const textarea = document.querySelector("textarea")!;
    await user.type(textarea, "Fixed the streetlight");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "RESOLVE" })).not.toBeInTheDocument(),
    );
    expect(workflowService.fetchWorkflowDetails).toHaveBeenCalledTimes(2);
  });
});
