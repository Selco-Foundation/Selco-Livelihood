import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { translateOr } from "@/shared";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({
    to,
    children,
    onClick,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
  }) => (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../../hooks/use-create-incident-form", () => ({
  useCreateIncidentForm: vi.fn(),
}));

import { useCreateIncidentForm } from "../../hooks/use-create-incident-form";
import { CreateIncidentPage } from "./CreateIncidentPage";

const identityT = (key: string) => key;

function mockUseCreateIncidentForm(
  overrides: Partial<ReturnType<typeof useCreateIncidentForm>> = {},
) {
  vi.mocked(useCreateIncidentForm).mockReturnValue({
    t: identityT,
    translateOr,
    form: { endUser: null, asset: null, complaintType: null, comments: "" },
    updateField: vi.fn(),
    fieldErrors: {},
    endUserOptions: [],
    assetOptions: [],
    facilityById: new Map(),
    assetById: new Map(),
    complaintTypes: [],
    showEndUserDropdown: true,
    isFacilitiesLoading: false,
    isAssetsLoading: false,
    imageUploads: [],
    videoUploads: [],
    uploadFiles: vi.fn(),
    removeUpload: vi.fn(),
    isImageUploading: false,
    isVideoUploading: false,
    disableUpload: true,
    duplicateTickets: [],
    setDuplicateTickets: vi.fn(),
    canSubmit: false,
    submitError: null,
    setSubmitError: vi.fn(),
    createMutation: { mutate: vi.fn(), isPending: false },
    clearForm: vi.fn(),
    saveDraft: vi.fn(),
    validate: vi.fn().mockReturnValue(true),
    inboxPath: "/livelihood-ui/employee/im/inbox",
    submittedResponse: null,
    handleEndUserChange: vi.fn(),
    handleAssetChange: vi.fn(),
    handleComplaintTypeChange: vi.fn(),
    maxImageCount: 5,
    maxImageSizeMb: 5,
    maxVideoCount: 2,
    maxVideoSizeMb: 20,
    maxCommentLength: 500,
    ...overrides,
  } as never);
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockNavigate.mockReturnValue(Promise.resolve());
  mockUseCreateIncidentForm();
});

// TopBar renders LanguageSwitcher, which calls useLanguages -> useQuery, so every
// render needs a real QueryClient in context even though useCreateIncidentForm
// itself is mocked above.
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateIncidentPage />
    </QueryClientProvider>,
  );
}

describe("CreateIncidentPage", () => {
  it("renders the title and breadcrumbs linking back to overview and the inbox", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Raise New Ticket" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/livelihood-ui/employee",
    );
    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute(
      "href",
      "/livelihood-ui/employee/im/inbox",
    );
    expect(screen.getByText("Raise ticket")).toBeInTheDocument();
  });

  it("renders the create ticket form driven by useCreateIncidentForm", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /Submit ticket/ })).toBeInTheDocument();
  });

  it("passes this page's inbox path through to the form, used when the duplicate-tickets dialog is cancelled", async () => {
    const user = userEvent.setup();
    mockUseCreateIncidentForm({
      duplicateTickets: [{ ticketId: "inc-9", ticketTenantId: "tenant-1" }],
    });
    renderPage();

    await user.click(screen.getByRole("button", { name: "No" }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/livelihood-ui/employee/im/inbox" });
  });
});
