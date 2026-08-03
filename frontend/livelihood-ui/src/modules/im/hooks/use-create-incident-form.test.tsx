/**
 * Unit tests for `useCreateIncidentForm`, the hook backing the "create incident"
 * form in the Incident Management (IM) module.
 *
 * Coverage:
 * - `validate()` field-level rules (required end user/asset/complaint type, max comment length)
 * - `canSubmit` derived state
 * - `uploadFiles()` media validation + delegation to the image/video upload services
 * - auto-selecting the end user (and enabling uploads) when jurisdiction search returns
 *   exactly one facility
 * - sessionStorage draft persistence (restore on mount, corrupt-draft recovery, saveDraft)
 * - `createMutation`'s onSuccess handling of both the error-shaped and success-shaped
 *   incident-create responses
 *
 * Testing approach:
 * - The hook depends on React Query (facility/asset/mdms lookups) and react-i18next
 *   (`useTranslate`), so every test renders via `renderHook` wrapped in a real
 *   `QueryClientProvider` + `I18nextProvider` (see `createWrapper`) rather than mocking
 *   those hooks away — this keeps the query lifecycle (loading -> data) and translation
 *   fallback behavior (`translateOr`) exercised the same way the real app uses them.
 *   The test i18n instance is given empty translation resources on purpose, so
 *   `translateOr` falls through to its English default strings, which is what the
 *   assertions check against.
 * - All network-touching services (facility search, asset search, mdms service defs,
 *   duplicate-ticket search, file/video upload, incident create) are mocked with
 *   `vi.spyOn` per-test/per-suite rather than via module-level `vi.mock`, so each test
 *   can freely override just the responses it cares about.
 * - Auth/jurisdiction global stores are reset and reseeded in `beforeEach` so tests don't
 *   leak state, and `sessionStorage` (used for draft persistence) is cleared before/after
 *   every test for the same reason.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import i18next from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { buildFile } from "@/test/mocks/file";
import { useJurisdictionStore } from "@/shared";
import * as facilityService from "../services/facility-search";
import * as assetService from "../services/asset-search";
import * as fileUploadService from "../services/file-upload";
import * as incidentService from "../services/incident";
import * as mdmsService from "../services/mdms";
import { useCreateIncidentForm } from "./use-create-incident-form";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const testI18n = i18next.createInstance();
  testI18n.use(initReactI18next).init({
    lng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: { en_IN: { translations: {} } },
    react: { useSuspense: false },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={testI18n}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </I18nextProvider>
    );
  };
}

// Helper that drives the hook's three change handlers (end user, asset, complaint
// type) to put the form into a submittable state, mirroring the sequence a user
// would follow in the UI. Shared by every suite below that needs a "valid form".
function selectValidFields(result: { current: ReturnType<typeof useCreateIncidentForm> }) {
  act(() => {
    result.current.handleEndUserChange({
      tenantId: "livelihood",
      facilityId: "fac-1",
      facilityPocName: "Poc",
      boundaryCode: "B1",
    });
  });
  act(() => {
    result.current.handleAssetChange({
      assetId: "asset-1",
      tenantId: "livelihood",
      facilityId: "fac-1",
      boundaryCode: "B1",
      assetTypeId: "streetlight",
      name: "Streetlight",
    });
  });
  act(() => {
    result.current.handleComplaintTypeChange({ code: "C1", name: "Complaint" });
  });
}

beforeEach(() => {
  resetAuthStore();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
  seedAuthenticatedSession({ tenantId: "livelihood" });
  window.sessionStorage.clear();
  vi.spyOn(facilityService, "searchFacilitiesByJurisdiction").mockResolvedValue({
    facilities: [],
    total: 0,
  });
  vi.spyOn(assetService, "searchAssetsForFacility").mockResolvedValue([]);
  vi.spyOn(mdmsService, "fetchServiceDefsForMenuPath").mockResolvedValue([]);
  vi.spyOn(incidentService, "searchPotentialDuplicates").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  resetAuthStore();
});

// `validate()` builds a FieldErrors object from the current form state: endUser,
// asset, and complaintType are required; comments must not exceed
// MAX_COMMENT_LENGTH. It merges the computed errors into `fieldErrors` state and
// returns true only when no errors were produced.
describe("validate", () => {
  it("flags endUser, asset, and complaintType as required when empty", () => {
    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    let isValid = true;
    act(() => {
      isValid = result.current.validate();
    });

    expect(isValid).toBe(false);
    expect(result.current.fieldErrors.endUser).toBeTruthy();
    expect(result.current.fieldErrors.asset).toBeTruthy();
    expect(result.current.fieldErrors.complaintType).toBeTruthy();
  });

  // MAX_COMMENT_LENGTH is 1000 (see media-validation.ts); one character over that
  // boundary must trip the comments field error.
  it("flags comments exceeding the max length", () => {
    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.updateField("comments", "a".repeat(1001));
    });
    act(() => {
      result.current.validate();
    });

    expect(result.current.fieldErrors.comments).toBeTruthy();
  });

  it("passes when all required fields are set and comments are within the limit", () => {
    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    selectValidFields(result);

    let isValid = false;
    act(() => {
      isValid = result.current.validate();
    });
    expect(isValid).toBe(true);
  });
});

// `canSubmit` is a memoized boolean: true only when endUser, asset, and
// complaintType are all set AND neither image nor video upload is in flight.
// Unlike `validate`, it never touches `fieldErrors` — it's purely derived state
// used to enable/disable the submit button.
describe("canSubmit", () => {
  it("is false when required fields are missing", () => {
    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });
    expect(result.current.canSubmit).toBe(false);
  });

  it("is true once endUser/asset/complaintType are all set", () => {
    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    selectValidFields(result);

    expect(result.current.canSubmit).toBe(true);
  });
});

// `uploadFiles(files, kind)` runs `validateMediaFiles` (count/size/format rules)
// before doing anything else. On failure it sets `fieldErrors[kind]` and returns
// without calling any upload service. On success it clears that field error, then
// uploads each file sequentially via `uploadIncidentFile` (images) or
// `uploadIncidentVideo` (videos), appending the results to `imageUploads` /
// `videoUploads` respectively.
describe("uploadFiles", () => {
  // Minimal FileList stand-in: jsdom doesn't let tests construct a real FileList,
  // so this fakes just the shape `uploadFiles` relies on (`length` + `item()`).
  function buildFileList(files: File[]): FileList {
    return { length: files.length, item: (i: number) => files[i] ?? null, ...files } as unknown as FileList;
  }

  // MAX_IMAGE_COUNT is 5, so 6 files should fail the count check in
  // validateMediaFiles before uploadIncidentFile is ever invoked.
  it("sets a field error and does not call the upload service when validation fails (too many images)", async () => {
    const uploadSpy = vi.spyOn(fileUploadService, "uploadIncidentFile");
    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    const files = Array.from({ length: 6 }, (_, i) => buildFile(`img${i}.jpg`, 10, "image/jpeg"));
    await act(async () => {
      await result.current.uploadFiles(buildFileList(files), "image");
    });

    expect(result.current.fieldErrors.image).toBeTruthy();
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("uploads valid images and appends them to imageUploads", async () => {
    vi.spyOn(fileUploadService, "uploadIncidentFile").mockResolvedValue({
      fileStoreId: "fs-1",
    });
    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.uploadFiles(
        buildFileList([buildFile("img.jpg", 10, "image/jpeg")]),
        "image",
      );
    });

    expect(result.current.imageUploads).toHaveLength(1);
    expect(result.current.imageUploads[0].fileStoreId).toBe("fs-1");
  });

  // `kind === "video"` must route through `uploadIncidentVideo` rather than the
  // image upload service, and results go to `videoUploads`, not `imageUploads`.
  it("uses the video upload service for video kind", async () => {
    const videoUploadSpy = vi
      .spyOn(fileUploadService, "uploadIncidentVideo")
      .mockResolvedValue({ fileStoreId: "fs-video" });
    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.uploadFiles(
        buildFileList([buildFile("clip.mp4", 10, "video/mp4")]),
        "video",
      );
    });

    expect(videoUploadSpy).toHaveBeenCalled();
    expect(result.current.videoUploads).toHaveLength(1);
  });
});

// A `useEffect` in the hook watches `facilities` (from the jurisdiction facility
// search query): when the search resolves to exactly one facility and no end user
// has been chosen yet, it auto-fills `form.endUser` with that facility, resets
// asset/complaintType, and flips `disableUpload` to false. `showEndUserDropdown`
// is also derived from `facilities.length !== 1`, so a single-facility result
// hides the dropdown too.
describe("auto-select single facility", () => {
  it("auto-selects the end user and enables uploads when exactly one facility is returned", async () => {
    vi.spyOn(facilityService, "searchFacilitiesByJurisdiction").mockResolvedValue({
      facilities: [
        {
          tenantId: "livelihood",
          facilityId: "fac-1",
          facilityPocName: "Only Facility",
          boundaryCode: "B1",
        },
      ],
      total: 1,
    });

    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.form.endUser?.facilityId).toBe("fac-1"));
    expect(result.current.disableUpload).toBe(false);
    expect(result.current.showEndUserDropdown).toBe(false);
  });
});

// The hook persists an in-progress form to sessionStorage under
// DRAFT_STORAGE_KEY ("livelihood-im-create-draft"). On mount, a `useEffect` reads
// that key, JSON-parses it, and merges any saved `form` fields over EMPTY_FORM;
// a parse failure clears the corrupt key instead of throwing. `saveDraft()`
// writes the current form (plus uploaded file IDs) back to the same key, and a
// successful incident submission removes it (see the createMutation suite below).
describe("draft persistence", () => {
  it("restores a previously saved draft on mount", async () => {
    window.sessionStorage.setItem(
      "livelihood-im-create-draft",
      JSON.stringify({
        form: {
          endUser: null,
          asset: null,
          complaintType: { code: "C1", name: "Saved Complaint" },
          comments: "Saved comment",
        },
      }),
    );

    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.form.comments).toBe("Saved comment"));
    expect(result.current.form.complaintType?.code).toBe("C1");
  });

  // The stored value is deliberately invalid JSON so the effect's try/catch
  // branch is exercised: it must swallow the parse error, not crash the render,
  // and must remove the bad entry so a future mount doesn't retry it.
  it("clears a corrupt draft instead of throwing", () => {
    window.sessionStorage.setItem("livelihood-im-create-draft", "{not valid json");

    expect(() =>
      renderHook(() => useCreateIncidentForm("/im/inbox"), { wrapper: createWrapper() }),
    ).not.toThrow();
    expect(window.sessionStorage.getItem("livelihood-im-create-draft")).toBeNull();
  });

  it("saveDraft writes the current form state to sessionStorage", () => {
    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.updateField("comments", "Draft comment");
    });
    act(() => {
      result.current.saveDraft();
    });

    const stored = JSON.parse(window.sessionStorage.getItem("livelihood-im-create-draft")!);
    expect(stored.form.comments).toBe("Draft comment");
  });
});

// `createMutation`'s `onSuccess` callback branches on the shape of the
// incident-create response: when `IncidentWrappers` is absent, the call is
// treated as a failure (e.g. a duplicate-ticket rejection) and `submitError` is
// set from `Errors[0].message` (falling back to `response.message`, then a
// translated generic error). When `IncidentWrappers` is present, it's treated as
// success: the sessionStorage draft is cleared, the inbox queries are
// invalidated, and `submittedResponse` is set.
describe("createMutation.onSuccess", () => {
  // The mocked response includes `Errors` but no `IncidentWrappers`, which is the
  // condition the hook uses to detect a failed submission (e.g. server-side
  // duplicate detection) rather than a thrown exception.
  it("sets submitError when the response has no IncidentWrappers", async () => {
    vi.spyOn(incidentService, "createIncident").mockResolvedValue({
      Errors: [{ message: "DUPLICATE" }],
    });
    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    selectValidFields(result);

    act(() => {
      result.current.createMutation.mutate();
    });

    await waitFor(() => expect(result.current.submitError).toBe("DUPLICATE"));
  });

  // A pre-existing (even empty "{}") draft in sessionStorage must be removed once
  // the response carries `IncidentWrappers`, confirming the success branch clears
  // the draft rather than leaving stale state behind for the next visit.
  it("sets submittedResponse and clears the draft when the response has IncidentWrappers", async () => {
    window.sessionStorage.setItem("livelihood-im-create-draft", "{}");
    vi.spyOn(incidentService, "createIncident").mockResolvedValue({
      IncidentWrappers: [{ incident: { incidentId: "INC-1" } }],
    });
    const { result } = renderHook(() => useCreateIncidentForm("/im/inbox"), {
      wrapper: createWrapper(),
    });

    selectValidFields(result);

    act(() => {
      result.current.createMutation.mutate();
    });

    await waitFor(() => expect(result.current.submittedResponse).toBeTruthy());
    expect(window.sessionStorage.getItem("livelihood-im-create-draft")).toBeNull();
  });
});
