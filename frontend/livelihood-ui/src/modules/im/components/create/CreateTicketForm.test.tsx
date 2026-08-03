/**
 * Unit tests for CreateTicketForm (src/modules/im/components/create/CreateTicketForm.tsx).
 *
 * CreateTicketForm is a thin orchestrator: nearly all state (form values, field
 * errors, canSubmit, disableUpload, duplicateTickets, createMutation, ...) lives in
 * the `useCreateIncidentForm` hook, which already has its own dedicated test suite
 * (../../hooks/use-create-incident-form.test.tsx covering validate/canSubmit/upload/
 * draft-persistence/mutation branches in isolation). This file therefore does NOT
 * mock that hook — it renders the real component with the real hook wired to real
 * TanStack Query state, and only mocks the underlying service-layer calls the hook
 * makes (facility/asset search, MDMS complaint types, duplicate search, file
 * upload, and incident creation) via `vi.spyOn` on the service modules, exactly like
 * the sibling ComplaintActionDialog and DesktopInbox test files. This is what lets
 * us exercise the component's OWN branching — the bits that live directly in
 * CreateTicketForm.tsx:
 *   - handleSubmit's gating: setSubmitError(null) -> validate() -> canSubmit -> mutate()
 *   - the portal-rendered loading overlay while createMutation.isPending
 *   - the conditional DuplicateTicketsDialog / TicketSubmittedDialog portals
 *   - the End User dropdown vs. read-only text branch (showEndUserDropdown)
 *   - disabled states cascading from one field to the next (asset needs endUser,
 *     complaint type needs asset, media upload needs disableUpload)
 *   - the submitError banner and the comment length counter
 *
 * A real TanStack RouterProvider (createMemoryHistory + createRootRoute) wraps every
 * render because DuplicateTicketsDialog and TicketSubmittedDialog render <Link>
 * elements and the component itself calls useNavigate(); a lightweight test-only
 * i18next instance (no resources) is used so translateOr() falls back to its
 * English default strings, never hitting the app's real network-backed i18n setup.
 * Interactions use userEvent with async findBy and waitFor assertions to accommodate
 * the effects (facility/asset/complaint-type/duplicate queries) that resolve after
 * mount or after a field changes.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { buildFile } from "@/test/mocks/file";
import { useJurisdictionStore } from "@/shared";
import * as facilityService from "../../services/facility-search";
import * as assetService from "../../services/asset-search";
import * as fileUploadService from "../../services/file-upload";
import * as incidentService from "../../services/incident";
import * as inboxService from "../../services/inbox";
import * as mdmsService from "../../services/mdms";
import type { LivelihoodAsset, LivelihoodFacility } from "../../types/facility-asset";
import { CreateTicketForm } from "./CreateTicketForm";

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

const INBOX_PATH = "/livelihood-ui/employee/im/inbox";

function renderForm(inboxPath = INBOX_PATH) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    component: () => <CreateTicketForm inboxPath={inboxPath} />,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

function buildFacility(overrides: Partial<LivelihoodFacility> = {}): LivelihoodFacility {
  return {
    tenantId: "livelihood",
    facilityId: "fac-1",
    facilityPocName: "Facility One",
    boundaryCode: "B1",
    ...overrides,
  };
}

function buildAsset(overrides: Partial<LivelihoodAsset> = {}): LivelihoodAsset {
  return {
    assetId: "asset-1",
    tenantId: "livelihood",
    facilityId: "fac-1",
    boundaryCode: "B1",
    assetTypeId: "streetlight",
    name: "Streetlight",
    ...overrides,
  };
}

/** Locates a FormSelectField's trigger button by the visible field label text. */
function getSelectTrigger(labelText: string): HTMLElement {
  const label = screen.getByText(labelText);
  const wrapper = label.closest("div")!;
  const button = wrapper.querySelector("button");
  if (!button) {
    throw new Error(`No select trigger button found near label "${labelText}"`);
  }
  return button;
}

/**
 * Options only exist in the DOM while the popover is open, and the trigger only
 * becomes clickable once its backing query (facilities/assets) has resolved and
 * un-disabled it — so this waits for the trigger to be enabled before opening it,
 * then relies on findByText's built-in polling to pick up the option once its
 * data (possibly still in flight, e.g. complaint types) has arrived.
 */
async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  labelText: string,
  optionText: string,
) {
  await waitFor(() => expect(getSelectTrigger(labelText)).not.toBeDisabled());
  await user.click(getSelectTrigger(labelText));
  await user.click(await screen.findByText(optionText));
}

/**
 * Drives the form through all three required selections (end user, asset, issue
 * type) so canSubmit becomes true. Two facilities are required for this helper to
 * work through the dropdown (a single facility auto-selects and hides the
 * dropdown entirely — see the dedicated "single facility" test below).
 */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await selectOption(user, "End User", "Facility One");
  await selectOption(user, "Asset", "Streetlight");
  await selectOption(user, "Issue Type", "Broken bulb");

  // Selecting the issue type is what satisfies the hook's duplicate-search effect's
  // precondition (form.endUser && form.complaintType), which fires searchPotentialDuplicates
  // asynchronously. Waiting here for the mock to have been invoked and flushing one
  // microtask lets that promise settle inside this test, while its mock is still active,
  // before any assertions or teardown run.
  await waitFor(() =>
    expect(incidentService.searchPotentialDuplicates).toHaveBeenCalled(),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  resetAuthStore();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
  seedAuthenticatedSession({ tenantId: "livelihood" });
  vi.spyOn(facilityService, "searchFacilitiesByJurisdiction").mockResolvedValue({
    facilities: [
      buildFacility({ facilityId: "fac-1", facilityPocName: "Facility One" }),
      buildFacility({ facilityId: "fac-2", facilityPocName: "Facility Two" }),
    ],
    total: 2,
  });
  vi.spyOn(assetService, "searchAssetsForFacility").mockResolvedValue([
    buildAsset({ assetId: "asset-1", name: "Streetlight" }),
  ]);
  vi.spyOn(mdmsService, "fetchServiceDefsForMenuPath").mockResolvedValue([
    { key: "C1", serviceCode: "SVC1", menuPath: "path", name: "Broken bulb" },
  ]);
  vi.spyOn(incidentService, "searchPotentialDuplicates").mockResolvedValue([]);
  // searchPotentialDuplicates (mocked above) is itself a thin wrapper around
  // inboxService.searchInbox (see services/incident.ts), so it's mocked too as a
  // defense-in-depth safety net: if the duplicate-search effect ever runs against
  // the *real* searchPotentialDuplicates (e.g. because the component briefly stays
  // mounted into teardown, see the afterEach ordering note below), this keeps the
  // call resolving in-memory instead of falling through to a real, network-error-
  // throwing axios call in jsdom.
  vi.spyOn(inboxService, "searchInbox").mockResolvedValue({ items: [], totalCount: 0 });
});

afterEach(() => {
  // Unmount BEFORE touching the shared auth/jurisdiction stores below. The
  // duplicate-search effect's dependency array includes accessToken,
  // employeeTenantId, and user (all from those stores); if resetAuthStore() runs
  // while CreateTicketForm is still mounted (e.g. if this ran before cleanup()),
  // it would change those deps and re-fire the effect with the still-set
  // form.endUser/form.complaintType from this test -- and since vi.restoreAllMocks()
  // has already run by then, that re-fire would hit the *real* (unmocked)
  // searchPotentialDuplicates -> searchInbox -> axios chain, which throws a real
  // network error in jsdom as an unhandled rejection after this test has already
  // finished. Unmounting first removes the component (and its store subscriptions)
  // before any of that can happen.
  cleanup();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  resetAuthStore();
});

// Covers the component's default render: two facilities means showEndUserDropdown
// is true (facilities.length !== 1), and every field downstream of an unselected
// end user (asset, issue type, media upload, submit) should start out disabled.
describe("CreateTicketForm field cascading", () => {
  it("disables Asset until an End User is selected, and disables Issue Type until an Asset is selected", async () => {
    renderForm();

    await waitFor(() => expect(getSelectTrigger("End User")).not.toBeDisabled());
    expect(getSelectTrigger("Asset")).toBeDisabled();
    expect(getSelectTrigger("Issue Type")).toBeDisabled();

    const user = userEvent.setup();
    await selectOption(user, "End User", "Facility One");

    await waitFor(() => expect(getSelectTrigger("Asset")).not.toBeDisabled());
    expect(getSelectTrigger("Issue Type")).toBeDisabled();
  });

  it("disables the submit button until end user, asset, and issue type are all selected", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(await screen.findByRole("button", { name: /Submit ticket/i })).toBeDisabled();

    await fillValidForm(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Submit ticket/i })).not.toBeDisabled(),
    );
  });

  it("disables the image/video upload zones until an end user is selected (disableUpload)", async () => {
    renderForm();
    await waitFor(() => expect(getSelectTrigger("End User")).not.toBeDisabled());

    // MediaUploadZone's own trigger is a <button> containing the hint text.
    expect(screen.getByText("Tap to upload images").closest("button")).toBeDisabled();
    expect(screen.getByText("Tap to upload videos").closest("button")).toBeDisabled();

    const user = userEvent.setup();
    await selectOption(user, "End User", "Facility One");

    await waitFor(() =>
      expect(screen.getByText("Tap to upload images").closest("button")).not.toBeDisabled(),
    );
  });
});

// handleSubmit in CreateTicketForm.tsx: setSubmitError(null); if (!validate()) return;
// if (!canSubmit) return; createMutation.mutate(). validate() is the hook's own
// required-field + comment-length check; the component's job is to actually call
// it on submit and never call mutate() until it passes.
describe("CreateTicketForm submit gating (handleSubmit -> validate -> canSubmit)", () => {
  it("shows required-field errors and never calls createIncident when submitting an empty form", async () => {
    const createSpy = vi.spyOn(incidentService, "createIncident");
    renderForm();
    await waitFor(() => expect(getSelectTrigger("End User")).not.toBeDisabled());

    // The submit <Button> is disabled while canSubmit is false (no fields selected),
    // so userEvent.click on it is a no-op in jsdom exactly as it would be in a real
    // browser -- there is no way for a user to trigger handleSubmit through it here.
    // handleSubmit itself lives on the <form>'s onSubmit, so firing a submit event on
    // the form directly is the only way to exercise its own validate()/canSubmit
    // gating logic (as opposed to the disabled-button rendering, already covered by
    // the "disables the submit button" test above).
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.submit(screen.getByRole("button", { name: /Submit ticket/i }).closest("form")!);

    await waitFor(() =>
      expect(screen.getByText("Please select an end user to continue")).toBeInTheDocument(),
    );
    expect(screen.getByText("Please select an asset to continue")).toBeInTheDocument();
    expect(screen.getByText("Please select an issue type to continue")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("blocks submission on an over-length comment even when the other required fields are valid", async () => {
    const createSpy = vi.spyOn(incidentService, "createIncident");
    const user = userEvent.setup();
    renderForm();

    await fillValidForm(user);

    // The textarea's maxLength=1000 attribute would block userEvent.type from ever
    // exceeding the limit (it mimics real browser input constraints), so fireEvent
    // is used to set an over-length value directly and exercise the
    // INCIDENT_COMMENTS_MAX_LENGTH validation branch inside validate().
    const { fireEvent } = await import("@testing-library/react");
    const textarea = document.getElementById("incident-comments") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "a".repeat(1001) } });

    await user.click(screen.getByRole("button", { name: /Submit ticket/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Comments cannot exceed 1000 characters."),
      ).toBeInTheDocument(),
    );
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("shows the character counter reflecting the current comment length", async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(getSelectTrigger("End User")).not.toBeDisabled());

    const textarea = document.getElementById("incident-comments") as HTMLTextAreaElement;
    await user.type(textarea, "Broken bulb near gate");

    expect(screen.getByText("21/1000")).toBeInTheDocument();
  });
});

// Once validate() and canSubmit both pass, handleSubmit calls createMutation.mutate().
// While createMutation.isPending is true, CreateTicketForm portals a full-screen
// spinner overlay into document.body (createPortal(..., document.body)) and
// disables the submit button; on success with IncidentWrappers present it renders
// TicketSubmittedDialog with the returned incident id.
describe("CreateTicketForm successful submission", () => {
  it("shows the loading overlay while the mutation is pending, then the TicketSubmittedDialog on success", async () => {
    let resolveCreate!: (value: unknown) => void;
    vi.spyOn(incidentService, "createIncident").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const user = userEvent.setup();
    renderForm();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /Submit ticket/i }));

    await waitFor(() =>
      expect(document.querySelector(".animate-spin")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Submit ticket/i })).toBeDisabled();

    resolveCreate({ IncidentWrappers: [{ incident: { incidentId: "INC-99" } }] });

    expect(await screen.findByText("Ticket Submitted")).toBeInTheDocument();
    expect(screen.getByText("INC-99")).toBeInTheDocument();
    expect(document.querySelector(".animate-spin")).not.toBeInTheDocument();
  });

  it("shows the response's error message in the submit-error banner when the response has no IncidentWrappers", async () => {
    vi.spyOn(incidentService, "createIncident").mockResolvedValue({
      Errors: [{ message: "Duplicate ticket already open" }],
    });
    const user = userEvent.setup();
    renderForm();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /Submit ticket/i }));

    expect(await screen.findByText("Duplicate ticket already open")).toBeInTheDocument();
    expect(screen.queryByText("Ticket Submitted")).not.toBeInTheDocument();
  });
});

// The hook's duplicate-search effect fires once form.endUser and form.complaintType
// are both set (regardless of asset), and the resulting list is rendered by
// CreateTicketForm as a DuplicateTicketsDialog portal. "Yes" (onContinue) clears
// duplicateTickets and lets the user proceed; the component itself does nothing
// more than wire that callback to setDuplicateTickets([]).
describe("CreateTicketForm duplicate tickets dialog", () => {
  it("shows the duplicate tickets dialog once a matching end user + issue type is selected, and dismisses it on Yes", async () => {
    vi.spyOn(incidentService, "searchPotentialDuplicates").mockResolvedValue([
      { ticketId: "INC-DUP-1", ticketTenantId: "livelihood" },
    ]);
    const user = userEvent.setup();
    renderForm();

    await fillValidForm(user);

    expect(
      await screen.findByText("Potential Duplicate Tickets Found"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "INC-DUP-1" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() =>
      expect(screen.queryByText("Potential Duplicate Tickets Found")).not.toBeInTheDocument(),
    );
  });
});

// facilities.length === 1 is a distinct branch from the dropdown case: the hook
// auto-selects that single facility and CreateTicketForm renders it as read-only
// text instead of a FormSelectField (showEndUserDropdown is false).
describe("CreateTicketForm single-facility auto-select", () => {
  it("renders the sole facility as read-only text instead of a dropdown", async () => {
    vi.spyOn(facilityService, "searchFacilitiesByJurisdiction").mockResolvedValue({
      facilities: [buildFacility({ facilityId: "fac-only", facilityPocName: "Only Facility" })],
      total: 1,
    });
    renderForm();

    expect(await screen.findByText("Only Facility")).toBeInTheDocument();
    // Read-only branch renders a <p>, not a select trigger <button>, next to the label.
    const label = screen.getByText("End User");
    expect(label.closest("div")!.querySelector("button")).not.toBeInTheDocument();
  });
});

// uploadFiles (in the hook) validates file count/size/format before calling the
// upload service; CreateTicketForm just needs to surface the resulting fieldErrors.image
// text and reflect the uploaded file's presence once the service call resolves.
describe("CreateTicketForm media upload", () => {
  it("uploads a valid image and lists it once the upload service resolves", async () => {
    vi.spyOn(fileUploadService, "uploadIncidentFile").mockResolvedValue({ fileStoreId: "fs-1" });
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);

    const fileInput = document.querySelector(
      'input[type="file"][accept*="image"]',
    ) as HTMLInputElement;
    await user.upload(fileInput, buildFile("photo.jpg", 10, "image/jpeg"));

    expect(await screen.findByText("photo.jpg")).toBeInTheDocument();
  });
});
