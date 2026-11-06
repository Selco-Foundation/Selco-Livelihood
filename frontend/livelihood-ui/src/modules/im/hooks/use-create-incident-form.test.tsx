import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore, useJurisdictionStore } from "@/shared";
import { useCreateIncidentForm } from "./use-create-incident-form";
import type { SelectOption } from "../types/create-incident";
import type { LivelihoodAsset, LivelihoodFacility } from "../types/facility-asset";
import { MAX_COMMENT_LENGTH, MAX_IMAGE_COUNT, MAX_IMAGE_SIZE_MB } from "../utils/media-validation";

// `t` must be a referentially stable function: the hook's complaint-type-fetch
// effect lists `t` as a dependency and unconditionally calls setState with a new
// array/object each run, so a `t` that changes identity every render (e.g. a
// fresh arrow function per call) puts that effect in an infinite render loop.
// react-i18next's real `t` is stable across renders, which is why this only
// bites a mock, not production.
const stableT = (key: string) => key;

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    useTranslate: () => ({ t: stableT }),
  };
});

vi.mock("../services/facility-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/facility-search")>();
  return { ...actual, searchFacilitiesByJurisdiction: vi.fn() };
});
vi.mock("../services/asset-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/asset-search")>();
  return { ...actual, searchAssetsForFacility: vi.fn() };
});
vi.mock("../services/file-upload", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/file-upload")>();
  return { ...actual, uploadIncidentFile: vi.fn(), uploadIncidentVideo: vi.fn() };
});
vi.mock("../services/incident", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/incident")>();
  return { ...actual, createIncident: vi.fn(), searchPotentialDuplicates: vi.fn() };
});
vi.mock("../services/mdms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/mdms")>();
  return { ...actual, fetchServiceDefsForMenuPath: vi.fn() };
});

import { searchFacilitiesByJurisdiction } from "../services/facility-search";
import { searchAssetsForFacility } from "../services/asset-search";
import { uploadIncidentFile, uploadIncidentVideo } from "../services/file-upload";
import { createIncident, searchPotentialDuplicates } from "../services/incident";
import { fetchServiceDefsForMenuPath } from "../services/mdms";

const DRAFT_STORAGE_KEY = "livelihood-im-create-draft";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

function facility(overrides: Partial<LivelihoodFacility> = {}): LivelihoodFacility {
  return {
    tenantId: "tenant-1",
    facilityId: "fac-1",
    facilityPocName: "POC One",
    boundaryCode: "boundary-1",
    ...overrides,
  };
}

function asset(overrides: Partial<LivelihoodAsset> = {}): LivelihoodAsset {
  return {
    assetId: "asset-1",
    tenantId: "tenant-1",
    facilityId: "fac-1",
    boundaryCode: "boundary-1",
    assetTypeId: "TYPE_1",
    name: "Asset One",
    ...overrides,
  };
}

const complaintType: SelectOption = { code: "SVC1", key: "SVC1", name: "Issue One" };

const authedUser = { uuid: "user-1", userName: "jdoe", tenantId: "tenant-1" };

function toFileList(files: File[]): FileList {
  return files as unknown as FileList;
}

beforeEach(() => {
  vi.mocked(searchFacilitiesByJurisdiction).mockReset().mockResolvedValue({ facilities: [], total: 0 });
  vi.mocked(searchAssetsForFacility).mockReset().mockResolvedValue([]);
  vi.mocked(uploadIncidentFile).mockReset().mockResolvedValue({ fileStoreId: "fs-1" });
  vi.mocked(uploadIncidentVideo).mockReset().mockResolvedValue({ fileStoreId: "fv-1" });
  vi.mocked(createIncident).mockReset().mockResolvedValue({ IncidentWrappers: [{ incident: { incidentId: "INC-1" } }] });
  vi.mocked(searchPotentialDuplicates).mockReset().mockResolvedValue([]);
  vi.mocked(fetchServiceDefsForMenuPath).mockReset().mockResolvedValue([]);
  sessionStorage.clear();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
  sessionStorage.clear();
});

describe("useCreateIncidentForm - facilities", () => {
  it("auto-selects the only facility as end user, enables uploads, and hides the end user dropdown", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchFacilitiesByJurisdiction).mockResolvedValue({ facilities: [facility()], total: 1 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    await waitFor(() => expect(result.current.form.endUser).toEqual(facility()));
    expect(result.current.showEndUserDropdown).toBe(false);
    expect(result.current.disableUpload).toBe(false);
  });

  it("shows the end user dropdown and leaves end user unselected when there are zero facilities", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchFacilitiesByJurisdiction).mockResolvedValue({ facilities: [], total: 0 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    await waitFor(() => expect(result.current.isFacilitiesLoading).toBe(false));
    expect(result.current.showEndUserDropdown).toBe(true);
    expect(result.current.form.endUser).toBeNull();
    expect(result.current.disableUpload).toBe(true);
  });

  it("shows the end user dropdown with multiple facilities and maps endUserOptions from facilityPocName", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchFacilitiesByJurisdiction).mockResolvedValue({
      facilities: [
        facility({ facilityId: "f1", facilityPocName: "Alice" }),
        facility({ facilityId: "f2", facilityPocName: "Bob" }),
      ],
      total: 2,
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    await waitFor(() => expect(result.current.endUserOptions).toEqual([
      { code: "f1", name: "Alice" },
      { code: "f2", name: "Bob" },
    ]));
    expect(result.current.showEndUserDropdown).toBe(true);
  });

  it("never calls searchFacilitiesByJurisdiction when accessToken is missing", async () => {
    useAuthStore.setState({ accessToken: null, employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    await waitFor(() => expect(result.current.isFacilitiesLoading).toBe(false));
    expect(searchFacilitiesByJurisdiction).not.toHaveBeenCalled();
  });
});

describe("useCreateIncidentForm - assets", () => {
  it("loads assets for the selected end user's facility and maps assetOptions with a translated fallback name", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchFacilitiesByJurisdiction).mockResolvedValue({ facilities: [facility()], total: 1 });
    vi.mocked(searchAssetsForFacility).mockResolvedValue([
      asset({ assetId: "a1", assetTypeId: "TYPE_1", name: "Asset One" }),
    ]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    await waitFor(() => expect(result.current.assetOptions).toEqual([{ code: "a1", name: "Asset One" }]));
    expect(searchAssetsForFacility).toHaveBeenCalledWith("fac-1", "tenant-1", "token-1", authedUser);
  });
});

describe("useCreateIncidentForm - dependent field resets", () => {
  it("selecting a new end user clears the previously selected asset and complaint type", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility({ facilityId: "f1" })));
    act(() => result.current.handleAssetChange(asset({ assetId: "a1" })));
    act(() => result.current.handleComplaintTypeChange(complaintType));

    await waitFor(() => expect(result.current.form.complaintType).toEqual(complaintType));
    expect(result.current.form.asset).toEqual(asset({ assetId: "a1" }));

    act(() => result.current.handleEndUserChange(facility({ facilityId: "f2" })));

    expect(result.current.form.endUser).toEqual(facility({ facilityId: "f2" }));
    expect(result.current.form.asset).toBeNull();
    expect(result.current.form.complaintType).toBeNull();
  });

  it("selecting a new asset clears the previously selected complaint type but keeps the end user", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility({ facilityId: "f1" })));
    act(() => result.current.handleAssetChange(asset({ assetId: "a1" })));
    act(() => result.current.handleComplaintTypeChange(complaintType));

    await waitFor(() => expect(result.current.form.complaintType).toEqual(complaintType));

    act(() => result.current.handleAssetChange(asset({ assetId: "a2" })));

    expect(result.current.form.endUser).toEqual(facility({ facilityId: "f1" }));
    expect(result.current.form.asset).toEqual(asset({ assetId: "a2" }));
    expect(result.current.form.complaintType).toBeNull();
  });

  it("does not reset disableUpload when the end user is cleared to null", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility()));
    expect(result.current.disableUpload).toBe(false);

    act(() => result.current.handleEndUserChange(null));

    expect(result.current.form.endUser).toBeNull();
    expect(result.current.disableUpload).toBe(false);
  });
});

describe("useCreateIncidentForm - complaint type options", () => {
  it("fetches complaint type options for the selected asset's asset type and maps them", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(fetchServiceDefsForMenuPath).mockResolvedValue([
      { key: "SVC1", serviceCode: "SVC1", menuPath: "TYPE_1", name: "Issue One" },
    ]);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleAssetChange(asset({ assetTypeId: "TYPE_1" })));

    await waitFor(() =>
      expect(result.current.complaintTypes).toEqual([
        { code: "SVC1", key: "SVC1", serviceCode: "SVC1", menuPath: "TYPE_1", name: "Issue One" },
      ]),
    );
    expect(fetchServiceDefsForMenuPath).toHaveBeenCalledWith("token-1", authedUser, "TYPE_1", expect.any(Function));
  });

  it("clears complaint type options when the asset is cleared", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(fetchServiceDefsForMenuPath).mockResolvedValue([
      { key: "SVC1", serviceCode: "SVC1", menuPath: "TYPE_1", name: "Issue One" },
    ]);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleAssetChange(asset({ assetTypeId: "TYPE_1" })));
    await waitFor(() => expect(result.current.complaintTypes.length).toBe(1));

    act(() => result.current.handleAssetChange(null));

    await waitFor(() => expect(result.current.complaintTypes).toEqual([]));
  });
});

describe("useCreateIncidentForm - duplicate ticket detection", () => {
  it("looks up potential duplicate tickets once both end user and complaint type are set", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    useJurisdictionStore.setState({ boundaries: { district: ["D1"] }, hrmsUser: null });
    vi.mocked(searchPotentialDuplicates).mockResolvedValue([{ ticketId: "T1", ticketTenantId: "tenant-1" }]);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility({ facilityId: "f1" })));
    act(() => result.current.handleComplaintTypeChange(complaintType));

    await waitFor(() =>
      expect(result.current.duplicateTickets).toEqual([{ ticketId: "T1", ticketTenantId: "tenant-1" }]),
    );
    expect(searchPotentialDuplicates).toHaveBeenCalledWith(
      "tenant-1",
      { district: ["D1"] },
      "f1",
      "SVC1",
      "token-1",
      authedUser,
    );
  });

  it("resets duplicate tickets to empty when the complaint type is cleared", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchPotentialDuplicates).mockResolvedValue([{ ticketId: "T1", ticketTenantId: "tenant-1" }]);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility({ facilityId: "f1" })));
    act(() => result.current.handleComplaintTypeChange(complaintType));
    await waitFor(() => expect(result.current.duplicateTickets.length).toBe(1));

    act(() => result.current.handleAssetChange(null));

    await waitFor(() => expect(result.current.duplicateTickets).toEqual([]));
  });
});

describe("useCreateIncidentForm - media uploads", () => {
  it("uploads image files and appends them with the returned fileStoreId", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(uploadIncidentFile).mockResolvedValue({ fileStoreId: "fs-1" });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    const file = new File(["content"], "photo.png", { type: "image/png" });

    await act(async () => {
      await result.current.uploadFiles(toFileList([file]), "image");
    });

    expect(result.current.imageUploads).toEqual([
      { file, fileStoreId: "fs-1", masterFileStoreId: undefined, kind: "image" },
    ]);
    expect(result.current.isImageUploading).toBe(false);
    expect(uploadIncidentFile).toHaveBeenCalledWith(file, "tenant-1", "token-1");
  });

  it("uploads video files via uploadIncidentVideo and records the masterFileStoreId", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(uploadIncidentVideo).mockResolvedValue({ fileStoreId: "fv-1", masterFileStoreId: "mv-1" });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    const file = new File(["content"], "clip.mp4", { type: "video/mp4" });

    await act(async () => {
      await result.current.uploadFiles(toFileList([file]), "video");
    });

    expect(result.current.videoUploads).toEqual([
      { file, fileStoreId: "fv-1", masterFileStoreId: "mv-1", kind: "video" },
    ]);
    expect(uploadIncidentVideo).toHaveBeenCalledWith(file, "tenant-1", "token-1");
  });

  it("sets a field error and skips the upload call when the image count exceeds the max", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    const files = Array.from({ length: MAX_IMAGE_COUNT + 1 }, (_, i) =>
      new File(["x"], `photo${i}.png`, { type: "image/png" }),
    );

    await act(async () => {
      await result.current.uploadFiles(toFileList(files), "image");
    });

    expect(result.current.fieldErrors.image).toBe(`You can upload up to ${MAX_IMAGE_COUNT} images`);
    expect(uploadIncidentFile).not.toHaveBeenCalled();
    expect(result.current.imageUploads).toEqual([]);
  });

  it("sets a field error when an image file's format is invalid", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });

    await act(async () => {
      await result.current.uploadFiles(toFileList([file]), "image");
    });

    expect(result.current.fieldErrors.image).toBe("Only JPG, JPEG, PNG formats are supported");
    expect(uploadIncidentFile).not.toHaveBeenCalled();
  });

  it("sets a field error when an image file exceeds the max size", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    const file = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: (MAX_IMAGE_SIZE_MB + 1) * 1024 * 1024 });

    await act(async () => {
      await result.current.uploadFiles(toFileList([file]), "image");
    });

    expect(result.current.fieldErrors.image).toBe(`Each image must be ${MAX_IMAGE_SIZE_MB}MB or smaller`);
    expect(uploadIncidentFile).not.toHaveBeenCalled();
  });

  it("removeUpload removes a previously uploaded image by fileStoreId", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    const file = new File(["content"], "photo.png", { type: "image/png" });
    await act(async () => {
      await result.current.uploadFiles(toFileList([file]), "image");
    });
    expect(result.current.imageUploads).toHaveLength(1);

    act(() => result.current.removeUpload("image", "fs-1"));

    expect(result.current.imageUploads).toEqual([]);
  });
});

describe("useCreateIncidentForm - validate", () => {
  it("reports required-field errors for endUser, asset, and complaintType when the form is empty", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    let isValid = true;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid).toBe(false);
    expect(result.current.fieldErrors.endUser).toBe("Please select an end user to continue");
    expect(result.current.fieldErrors.asset).toBe("Please select an asset to continue");
    expect(result.current.fieldErrors.complaintType).toBe("Please select an issue type to continue");
  });

  it("reports a comments-too-long error and passes once every field is valid", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility()));
    act(() => result.current.handleAssetChange(asset()));
    act(() => result.current.handleComplaintTypeChange(complaintType));
    act(() => result.current.updateField("comments", "x".repeat(MAX_COMMENT_LENGTH + 1)));

    let isValid = true;
    act(() => {
      isValid = result.current.validate();
    });
    expect(isValid).toBe(false);
    expect(result.current.fieldErrors.comments).toBe(
      `Comments cannot exceed ${MAX_COMMENT_LENGTH} characters.`,
    );

    act(() => result.current.updateField("comments", "short comment"));
    act(() => {
      isValid = result.current.validate();
    });
    expect(isValid).toBe(true);
  });
});

describe("useCreateIncidentForm - canSubmit", () => {
  it("is false until endUser, asset, and complaintType are all set, and true once they are", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.handleEndUserChange(facility()));
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.handleAssetChange(asset()));
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.handleComplaintTypeChange(complaintType));
    expect(result.current.canSubmit).toBe(true);
  });

  it("is false while an image upload is in progress", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    let resolveUpload: (value: { fileStoreId: string }) => void = () => {};
    vi.mocked(uploadIncidentFile).mockImplementation(
      () => new Promise((resolve) => { resolveUpload = resolve; }),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility()));
    act(() => result.current.handleAssetChange(asset()));
    act(() => result.current.handleComplaintTypeChange(complaintType));
    expect(result.current.canSubmit).toBe(true);

    const file = new File(["content"], "photo.png", { type: "image/png" });
    let uploadPromise!: Promise<void>;
    act(() => {
      uploadPromise = result.current.uploadFiles(toFileList([file]), "image");
    });

    await waitFor(() => expect(result.current.isImageUploading).toBe(true));
    expect(result.current.canSubmit).toBe(false);

    await act(async () => {
      resolveUpload({ fileStoreId: "fs-1" });
      await uploadPromise;
    });

    expect(result.current.isImageUploading).toBe(false);
    expect(result.current.canSubmit).toBe(true);
  });
});

describe("useCreateIncidentForm - submit mutation", () => {
  it("submits successfully, builds uploadedDocuments from image and video uploads, and stores the response", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(uploadIncidentFile).mockResolvedValue({ fileStoreId: "fs-1" });
    vi.mocked(uploadIncidentVideo).mockResolvedValue({ fileStoreId: "fv-1", masterFileStoreId: "mv-1" });
    const response = { IncidentWrappers: [{ incident: { incidentId: "INC-1" } }] };
    vi.mocked(createIncident).mockResolvedValue(response);
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ form: {} }));
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility()));
    act(() => result.current.handleAssetChange(asset()));
    act(() => result.current.handleComplaintTypeChange(complaintType));
    act(() => result.current.updateField("comments", "all good"));

    const imageFile = new File(["content"], "photo.png", { type: "image/png" });
    const videoFile = new File(["content"], "clip.mp4", { type: "video/mp4" });
    await act(async () => {
      await result.current.uploadFiles(toFileList([imageFile]), "image");
    });
    await act(async () => {
      await result.current.uploadFiles(toFileList([videoFile]), "video");
    });

    result.current.createMutation.mutate();

    await waitFor(() => expect(result.current.createMutation.isSuccess).toBe(true));

    expect(createIncident).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      endUser: facility(),
      asset: asset(),
      complaintType,
      comments: "all good",
      uploadedDocuments: [
        { fileStoreId: "fs-1", documentUid: "", documentType: "image/png", additionalDetails: {} },
        { fileStoreId: "mv-1", documentUid: "video1", documentType: "HLS", additionalDetails: {} },
        { fileStoreId: "fv-1", documentUid: "video1", documentType: "video/mp4", additionalDetails: {} },
      ],
      user: authedUser,
      accessToken: "token-1",
    });
    expect(result.current.submittedResponse).toEqual(response);
    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["im-inbox"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["im-inbox-summary"] });
  });

  it("sets submitError and does not invalidate queries or clear the draft when the response has no IncidentWrappers", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(createIncident).mockResolvedValue({ Errors: [{ message: "Duplicate incident" }] });
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ form: {} }));
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility()));
    act(() => result.current.handleAssetChange(asset()));
    act(() => result.current.handleComplaintTypeChange(complaintType));

    result.current.createMutation.mutate();

    await waitFor(() => expect(result.current.createMutation.isSuccess).toBe(true));

    expect(result.current.submitError).toBe("Duplicate incident");
    expect(result.current.submittedResponse).toBeNull();
    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("falls back to CS_COMMON_SOMETHING_WENT_WRONG when the failed response has no message at all", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(createIncident).mockResolvedValue({});
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility()));
    act(() => result.current.handleAssetChange(asset()));
    act(() => result.current.handleComplaintTypeChange(complaintType));

    result.current.createMutation.mutate();

    await waitFor(() => expect(result.current.createMutation.isSuccess).toBe(true));

    expect(result.current.submitError).toBe("Something went wrong!");
  });

  it("fails validation and does not call createIncident when required fields are missing", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    result.current.createMutation.mutate();

    await waitFor(() => expect(result.current.createMutation.isError).toBe(true));

    expect(result.current.createMutation.error).toEqual(new Error("VALIDATION_FAILED"));
    expect(createIncident).not.toHaveBeenCalled();
    expect(result.current.fieldErrors.endUser).toBe("Please select an end user to continue");
  });

  it("fails with AUTH_REQUIRED before running validation when accessToken is missing", async () => {
    useAuthStore.setState({ accessToken: null, employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility()));

    result.current.createMutation.mutate();

    await waitFor(() => expect(result.current.createMutation.isError).toBe(true));

    expect(result.current.createMutation.error).toEqual(new Error("AUTH_REQUIRED"));
    expect(createIncident).not.toHaveBeenCalled();
    expect(result.current.fieldErrors.asset).toBeUndefined();
  });
});

describe("useCreateIncidentForm - clearForm / draft persistence", () => {
  it("resets state to empty and re-selects the sole facility when there is exactly one", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchFacilitiesByJurisdiction).mockResolvedValue({ facilities: [facility()], total: 1 });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    await waitFor(() => expect(result.current.form.endUser).toEqual(facility()));

    act(() => result.current.handleAssetChange(asset()));
    act(() => result.current.handleComplaintTypeChange(complaintType));
    act(() => result.current.updateField("comments", "some notes"));
    act(() => result.current.saveDraft());
    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();

    act(() => result.current.clearForm());

    expect(result.current.form).toEqual({
      endUser: facility(),
      asset: null,
      complaintType: null,
      comments: "",
    });
    expect(result.current.disableUpload).toBe(false);
    expect(result.current.imageUploads).toEqual([]);
    expect(result.current.videoUploads).toEqual([]);
    expect(result.current.complaintTypes).toEqual([]);
    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("saveDraft persists the current form and upload ids to sessionStorage", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    act(() => result.current.handleEndUserChange(facility()));
    act(() => result.current.updateField("comments", "draft notes"));

    act(() => result.current.saveDraft());

    const stored = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!);
    expect(stored.form.comments).toBe("draft notes");
    expect(stored.form.endUser).toEqual(facility());
    expect(stored.imageUploads).toEqual([]);
    expect(stored.videoUploads).toEqual([]);
  });

  it("restores a saved draft into the form on mount", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ form: { endUser: null, asset: null, complaintType: null, comments: "restored" } }),
    );
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    await waitFor(() => expect(result.current.form.comments).toBe("restored"));
  });

  it("ignores and clears a corrupted draft on mount", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    sessionStorage.setItem(DRAFT_STORAGE_KEY, "not-json");
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateIncidentForm("/im"), { wrapper });

    await waitFor(() => expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull());
    expect(result.current.form.comments).toBe("");
  });
});
