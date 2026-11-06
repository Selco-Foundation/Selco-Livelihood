import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { translateOr } from "@/shared";

// jsdom doesn't implement URL.createObjectURL/revokeObjectURL, which
// MediaUploadZone's UploadedFileThumbnail calls for image previews.
beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});
import type { SelectOption } from "../../types/create-incident";
import type { LivelihoodAsset, LivelihoodFacility } from "../../types/facility-asset";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const mockUseCreateIncidentForm = vi.fn();
vi.mock("../../hooks/use-create-incident-form", () => ({
  useCreateIncidentForm: (inboxPath: string) => mockUseCreateIncidentForm(inboxPath),
}));

import { CreateTicketForm } from "./CreateTicketForm";

const stableT = (key: string) => key;

const facility: LivelihoodFacility = {
  tenantId: "tenant-1",
  facilityId: "f1",
  facilityPocName: "Alice",
  boundaryCode: "boundary-1",
};

const asset: LivelihoodAsset = {
  assetId: "a1",
  tenantId: "tenant-1",
  facilityId: "f1",
  boundaryCode: "boundary-1",
  assetTypeId: "TYPE_1",
  name: "Asset One",
};

const complaintType: SelectOption = { code: "SVC1", key: "SVC1", name: "Issue One" };

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    t: stableT,
    translateOr,
    form: { endUser: null, asset: null, complaintType: null, comments: "" },
    fieldErrors: {},
    endUserOptions: [],
    assetOptions: [],
    facilityById: new Map<string, LivelihoodFacility>(),
    assetById: new Map<string, LivelihoodAsset>(),
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
    validate: vi.fn(() => true),
    handleEndUserChange: vi.fn(),
    handleAssetChange: vi.fn(),
    handleComplaintTypeChange: vi.fn(),
    updateField: vi.fn(),
    maxImageCount: 5,
    maxImageSizeMb: 10,
    maxVideoCount: 2,
    maxVideoSizeMb: 50,
    maxCommentLength: 500,
    submittedResponse: null,
    ...overrides,
  };
}

function renderForm(overrides: Record<string, unknown> = {}) {
  const state = baseState(overrides);
  mockUseCreateIncidentForm.mockReturnValue(state);
  const result = render(<CreateTicketForm inboxPath="/im/inbox" />);
  return { ...result, state };
}

// FormSelectField's <label> isn't associated with its trigger button via
// htmlFor/id, so getByLabelText doesn't work; walk up to the shared wrapper
// div and grab the button within it instead.
function selectTriggerFor(labelText: string) {
  const label = screen.getByText(labelText);
  return label.parentElement!.querySelector("button") as HTMLButtonElement;
}

beforeEach(() => {
  mockNavigate.mockReset();
});

describe("CreateTicketForm - section rendering", () => {
  it("renders the three section headings and descriptions", () => {
    renderForm();

    expect(screen.getByText("Asset Details")).toBeInTheDocument();
    expect(screen.getByText("Select the end user and asset for this ticket")).toBeInTheDocument();
    expect(screen.getByText("Ticket Details")).toBeInTheDocument();
    expect(screen.getByText("Describe the problem so we can help faster")).toBeInTheDocument();
    expect(screen.getByText("Additional Details")).toBeInTheDocument();
    expect(
      screen.getByText("Provide more information or media to help us resolve the issue"),
    ).toBeInTheDocument();
  });
});

describe("CreateTicketForm - end user field", () => {
  it("renders the End User dropdown when showEndUserDropdown is true", () => {
    renderForm({ showEndUserDropdown: true });

    expect(selectTriggerFor("End User")).toBeInTheDocument();
  });

  it("renders the end user as read-only text when the dropdown is hidden and an end user is set", () => {
    renderForm({
      showEndUserDropdown: false,
      form: { endUser: facility, asset: null, complaintType: null, comments: "" },
    });

    const label = screen.getByText("End User");
    expect(label.parentElement!.querySelector("button")).toBeNull();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders neither the dropdown nor the read-only block when hidden and no end user is set", () => {
    renderForm({ showEndUserDropdown: false, form: { endUser: null, asset: null, complaintType: null, comments: "" } });

    expect(screen.queryByText("End User")).not.toBeInTheDocument();
  });

  it("calls handleEndUserChange with the matching facility from facilityById on selection", async () => {
    const user = userEvent.setup();
    const handleEndUserChange = vi.fn();
    renderForm({
      showEndUserDropdown: true,
      endUserOptions: [{ code: "f1", name: "Alice" }],
      facilityById: new Map([["f1", facility]]),
      handleEndUserChange,
    });

    await user.click(selectTriggerFor("End User"));
    await user.click(screen.getByText("Alice"));

    expect(handleEndUserChange).toHaveBeenCalledWith(facility);
  });

});

describe("CreateTicketForm - asset field", () => {
  it("disables the Asset field when no end user is selected", () => {
    renderForm({ form: { endUser: null, asset: null, complaintType: null, comments: "" } });

    expect(selectTriggerFor("Asset")).toBeDisabled();
  });

  it("enables the Asset field once an end user is selected and not loading", () => {
    renderForm({
      form: { endUser: facility, asset: null, complaintType: null, comments: "" },
      isAssetsLoading: false,
    });

    expect(selectTriggerFor("Asset")).toBeEnabled();
  });

  it("disables the Asset field while assets are loading even with an end user selected", () => {
    renderForm({
      form: { endUser: facility, asset: null, complaintType: null, comments: "" },
      isAssetsLoading: true,
    });

    expect(selectTriggerFor("Asset")).toBeDisabled();
  });

  it("calls handleAssetChange with the matching asset from assetById on selection", async () => {
    const user = userEvent.setup();
    const handleAssetChange = vi.fn();
    renderForm({
      form: { endUser: facility, asset: null, complaintType: null, comments: "" },
      assetOptions: [{ code: "a1", name: "Asset One" }],
      assetById: new Map([["a1", asset]]),
      handleAssetChange,
    });

    await user.click(selectTriggerFor("Asset"));
    await user.click(screen.getByText("Asset One"));

    expect(handleAssetChange).toHaveBeenCalledWith(asset);
  });
});

describe("CreateTicketForm - issue type field", () => {
  it("disables the Issue Type field when no asset is selected", () => {
    renderForm({ form: { endUser: facility, asset: null, complaintType: null, comments: "" } });

    expect(selectTriggerFor("Issue Type")).toBeDisabled();
  });

  it("enables the Issue Type field once an asset is selected", () => {
    renderForm({ form: { endUser: facility, asset, complaintType: null, comments: "" } });

    expect(selectTriggerFor("Issue Type")).toBeEnabled();
  });

  it("calls handleComplaintTypeChange with the selected option", async () => {
    const user = userEvent.setup();
    const handleComplaintTypeChange = vi.fn();
    renderForm({
      form: { endUser: facility, asset, complaintType: null, comments: "" },
      complaintTypes: [complaintType],
      handleComplaintTypeChange,
    });

    await user.click(selectTriggerFor("Issue Type"));
    await user.click(screen.getByText("Issue One"));

    expect(handleComplaintTypeChange).toHaveBeenCalledWith(complaintType);
  });
});

describe("CreateTicketForm - comments field", () => {
  it("renders the current comment value and character count against maxCommentLength", () => {
    renderForm({
      form: { endUser: null, asset: null, complaintType: null, comments: "hello" },
      maxCommentLength: 500,
    });

    expect(screen.getByLabelText("Comments")).toHaveValue("hello");
    expect(screen.getByText("5/500")).toBeInTheDocument();
  });

  it("sets maxLength on the textarea to maxCommentLength", () => {
    renderForm({ maxCommentLength: 120 });

    expect(screen.getByLabelText("Comments")).toHaveAttribute("maxLength", "120");
  });

  it("calls updateField with the typed value", async () => {
    const user = userEvent.setup();
    const updateField = vi.fn();
    renderForm({ updateField });

    await user.type(screen.getByLabelText("Comments"), "x");

    expect(updateField).toHaveBeenCalledWith("comments", "x");
  });

  it("shows the comments field error when present", () => {
    renderForm({ fieldErrors: { comments: "Comments cannot exceed 500 characters." } });

    expect(screen.getByText("Comments cannot exceed 500 characters.")).toBeInTheDocument();
  });
});

describe("CreateTicketForm - media uploads", () => {
  it("wires image and video labels and upload handlers to their respective MediaUploadZones", async () => {
    const uploadFiles = vi.fn();
    renderForm({ uploadFiles, disableUpload: false });

    expect(screen.getByText("Upload Images")).toBeInTheDocument();
    expect(screen.getByText("Upload Videos")).toBeInTheDocument();

    const file = new File(["content"], "photo.png", { type: "image/png" });
    await userEvent.setup().upload(screen.getByLabelText("Upload Images"), file);
    expect(uploadFiles).toHaveBeenCalledWith(expect.anything(), "image");

    const videoFile = new File(["content"], "clip.mp4", { type: "video/mp4" });
    await userEvent.setup().upload(screen.getByLabelText("Upload Videos"), videoFile);
    expect(uploadFiles).toHaveBeenCalledWith(expect.anything(), "video");
  });

  it("calls removeUpload with the image kind and fileStoreId", async () => {
    const user = userEvent.setup();
    const removeUpload = vi.fn();
    renderForm({
      imageUploads: [{ file: new File(["x"], "a.png"), fileStoreId: "fs-1", kind: "image" }],
      removeUpload,
    });

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(removeUpload).toHaveBeenCalledWith("image", "fs-1");
  });

  it("calls removeUpload with the video kind and fileStoreId", async () => {
    const user = userEvent.setup();
    const removeUpload = vi.fn();
    renderForm({
      videoUploads: [{ file: new File(["x"], "a.mp4"), fileStoreId: "fv-1", kind: "video" }],
      removeUpload,
    });

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(removeUpload).toHaveBeenCalledWith("video", "fv-1");
  });

  it("disables the image zone once imageUploads reaches maxImageCount", () => {
    renderForm({
      disableUpload: false,
      maxImageCount: 1,
      imageUploads: [{ file: new File(["x"], "a.png"), fileStoreId: "fs-1", kind: "image" }],
    });

    expect(screen.getByText("Tap to upload images").closest("button")).toBeDisabled();
  });

  it("shows field errors for image and video uploads", () => {
    renderForm({ fieldErrors: { image: "Only JPG, JPEG, PNG formats are supported", video: "Each video must be 50MB or smaller" } });

    expect(screen.getByText("Only JPG, JPEG, PNG formats are supported")).toBeInTheDocument();
    expect(screen.getByText("Each video must be 50MB or smaller")).toBeInTheDocument();
  });
});

describe("CreateTicketForm - submit error and button state", () => {
  it("renders the submit error message when present", () => {
    renderForm({ submitError: "Duplicate incident" });

    expect(screen.getByText("Duplicate incident")).toBeInTheDocument();
  });

  it("renders no submit error message when absent", () => {
    renderForm({ submitError: null });

    expect(screen.queryByText("Duplicate incident")).not.toBeInTheDocument();
  });

  it("disables the submit button when canSubmit is false", () => {
    renderForm({ canSubmit: false });

    expect(screen.getByRole("button", { name: /Submit ticket/ })).toBeDisabled();
  });

  it("disables the submit button while createMutation.isPending, even when canSubmit is true", () => {
    renderForm({ canSubmit: true, createMutation: { mutate: vi.fn(), isPending: true } });

    expect(screen.getByRole("button", { name: /Submit ticket/ })).toBeDisabled();
  });

  it("enables the submit button when canSubmit is true and not pending", () => {
    renderForm({ canSubmit: true, createMutation: { mutate: vi.fn(), isPending: false } });

    expect(screen.getByRole("button", { name: /Submit ticket/ })).toBeEnabled();
  });

  it("shows a spinning loader overlay while createMutation.isPending", () => {
    renderForm({ createMutation: { mutate: vi.fn(), isPending: true } });

    expect(document.querySelector(".animate-spin")).not.toBeNull();
  });

  it("shows no loader overlay when not pending", () => {
    renderForm({ createMutation: { mutate: vi.fn(), isPending: false } });

    expect(document.querySelector(".animate-spin")).toBeNull();
  });
});

describe("CreateTicketForm - submit flow", () => {
  it("clears the submit error and calls validate on submit", async () => {
    const user = userEvent.setup();
    const setSubmitError = vi.fn();
    const validate = vi.fn(() => true);
    const mutate = vi.fn();
    renderForm({
      canSubmit: true,
      setSubmitError,
      validate,
      createMutation: { mutate, isPending: false },
    });

    await user.click(screen.getByRole("button", { name: /Submit ticket/ }));

    expect(setSubmitError).toHaveBeenCalledWith(null);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("does not call createMutation.mutate when validate fails", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    renderForm({
      canSubmit: true,
      validate: vi.fn(() => false),
      createMutation: { mutate, isPending: false },
    });

    await user.click(screen.getByRole("button", { name: /Submit ticket/ }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not call createMutation.mutate when canSubmit is false, even if validate passes", () => {
    // The submit button is disabled whenever canSubmit is false, so a real
    // user could never click it into submitting; fireEvent.submit exercises
    // handleSubmit's own `if (!canSubmit) return` guard directly.
    const mutate = vi.fn();
    const { container } = renderForm({
      canSubmit: false,
      validate: vi.fn(() => true),
      createMutation: { mutate, isPending: false },
    });

    fireEvent.submit(container.querySelector("form")!);

    expect(mutate).not.toHaveBeenCalled();
  });
});

describe("CreateTicketForm - duplicate tickets dialog", () => {
  it("shows the duplicate tickets dialog when duplicateTickets is non-empty", () => {
    renderForm({ duplicateTickets: [{ ticketId: "T1", ticketTenantId: "tenant-1" }] });

    expect(screen.getByText("Potential Duplicate Tickets Found")).toBeInTheDocument();
  });

  it("hides the duplicate tickets dialog when duplicateTickets is empty", () => {
    renderForm({ duplicateTickets: [] });

    expect(screen.queryByText("Potential Duplicate Tickets Found")).not.toBeInTheDocument();
  });

  it("calls setDuplicateTickets with [] when continuing", async () => {
    const user = userEvent.setup();
    const setDuplicateTickets = vi.fn();
    renderForm({
      duplicateTickets: [{ ticketId: "T1", ticketTenantId: "tenant-1" }],
      setDuplicateTickets,
    });

    await user.click(screen.getByRole("button", { name: "Yes" }));

    expect(setDuplicateTickets).toHaveBeenCalledWith([]);
  });

  it("navigates to the inboxPath when cancelling", async () => {
    const user = userEvent.setup();
    renderForm({ duplicateTickets: [{ ticketId: "T1", ticketTenantId: "tenant-1" }] });

    await user.click(screen.getByRole("button", { name: "No" }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/im/inbox" });
  });
});

describe("CreateTicketForm - submitted dialog", () => {
  it("shows the ticket submitted dialog once submittedResponse carries an incidentId", () => {
    renderForm({
      submittedResponse: { IncidentWrappers: [{ incident: { incidentId: "INC-1" } }] },
    });

    expect(screen.getByText("Ticket Submitted")).toBeInTheDocument();
    expect(screen.getByText("INC-1")).toBeInTheDocument();
  });

  it("hides the ticket submitted dialog when submittedResponse is null", () => {
    renderForm({ submittedResponse: null });

    expect(screen.queryByText("Ticket Submitted")).not.toBeInTheDocument();
  });

  it("hides the ticket submitted dialog when submittedResponse has no incidentId", () => {
    renderForm({ submittedResponse: { IncidentWrappers: [{ incident: {} }] } });

    expect(screen.queryByText("Ticket Submitted")).not.toBeInTheDocument();
  });
});
