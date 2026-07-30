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

describe("uploadFiles", () => {
  function buildFileList(files: File[]): FileList {
    return { length: files.length, item: (i: number) => files[i] ?? null, ...files } as unknown as FileList;
  }

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

describe("createMutation.onSuccess", () => {
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
