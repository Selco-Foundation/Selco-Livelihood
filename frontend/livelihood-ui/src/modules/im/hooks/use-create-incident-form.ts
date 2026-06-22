import {
  aggregateBoundaryCodes,
  loadModules,
  tenantId,
  useAuthStore,
  useBoundary,
  useFacility,
  useJurisdictionStore,
  useTranslate,
} from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useImMdms } from "./use-im-inbox-summary";
import { createIncident, searchPotentialDuplicates } from "../services/incident";
import { uploadIncidentFile, uploadIncidentVideo } from "../services/file-upload";
import {
  fetchComplaintSubTypes,
  fetchComplaintTypes,
} from "../services/mdms";
import type {
  CreateIncidentFormValues,
  SelectOption,
  UploadedMediaEntry,
} from "../types/create-incident";
import { buildUploadedDocuments } from "../utils/create-incident-documents";

const DRAFT_STORAGE_KEY = "livelihood-im-create-draft";

interface FieldErrors {
  district?: string;
  block?: string;
  facility?: string;
  complaintType?: string;
  subType?: string;
  systemFunctionality?: string;
}

const EMPTY_FORM: CreateIncidentFormValues = {
  district: null,
  block: null,
  facility: null,
  complaintType: null,
  subType: null,
  systemFunctionality: null,
  comments: "",
};

function translateOr(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return value === key ? fallback : value;
}

export function useCreateIncidentForm(inboxPath: string, responsePath: string) {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const currentBoundary = useJurisdictionStore((state) => state.currentBoundary);
  const jurisdictionCodes = aggregateBoundaryCodes(currentBoundary);

  const [form, setForm] = useState<CreateIncidentFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [complaintTypes, setComplaintTypes] = useState<SelectOption[]>([]);
  const [subTypes, setSubTypes] = useState<SelectOption[]>([]);
  const [imageUploads, setImageUploads] = useState<UploadedMediaEntry[]>([]);
  const [videoUploads, setVideoUploads] = useState<UploadedMediaEntry[]>([]);
  const [firUploads, setFirUploads] = useState<UploadedMediaEntry[]>([]);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [isFirUploading, setIsFirUploading] = useState(false);
  const [duplicateTickets, setDuplicateTickets] = useState<
    Array<{ ticketId: string; ticketTenantId: string }>
  >([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [disableUpload, setDisableUpload] = useState(true);

  const { data: boundaryData } = useBoundary(jurisdictionCodes);
  const [facilityBoundaryCodes, setFacilityBoundaryCodes] = useState<string[]>(["-"]);
  const { data: facilityData } = useFacility(facilityBoundaryCodes);
  const { data: systemFunctionalityMenu } = useImMdms();

  const isTheftIssue = form.complaintType?.key?.toUpperCase() === "THEFT";
  const isInstallationTicket =
    form.complaintType?.key?.toUpperCase() === "UNINSTALL" ||
    form.complaintType?.key?.toUpperCase() === "REINSTALL";
  const isUninstalledFacility = form.facility?.status === "UNINSTALLED";

  const districtMenu = useMemo(() => {
    return (boundaryData?.districts ?? [])
      .map((district) => ({
        code: district.code,
        name: t(`Boundary_${district.code}`),
        parentCode: district.parentCode,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [boundaryData, t]);

  const blockMenu = useMemo(() => {
    if (!form.district?.code) {
      return [];
    }
    return (boundaryData?.blocks ?? [])
      .filter((block) => block.parentCode === form.district?.code)
      .map((block) => ({
        code: block.code,
        name: t(`Boundary_${block.code}`),
        parentCode: block.parentCode,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [boundaryData, form.district, t]);

  const facilityMenu = useMemo(() => {
    if (!form.block?.code || !facilityData?.facilities?.length) {
      return [];
    }
    const parentMap = new Map(
      (boundaryData?.facilities ?? []).map((facility) => [
        facility.code,
        facility.parentCode,
      ]),
    );
    return facilityData.facilities
      .filter((facility) => parentMap.get(facility.boundaryCode) === form.block?.code)
      .map((facility) => ({
        code: facility.boundaryCode,
        name: t(`Boundary_${facility.boundaryCode}`),
        id: facility.facilityId,
        status: facility.facilityStatus,
        parentCode: parentMap.get(facility.boundaryCode),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [boundaryData, facilityData, form.block, t]);

  const systemOptions = useMemo(
    () =>
      (systemFunctionalityMenu ?? []).map((item) => ({
        code: item.code,
        key: item.code,
        name: t(item.name),
      })),
    [systemFunctionalityMenu, t],
  );

  useEffect(() => {
    void loadModules(["rainmaker-im"]);
  }, []);

  useEffect(() => {
    if (boundaryData?.facilities) {
      setFacilityBoundaryCodes(
        boundaryData.facilities.map((facility) => facility.code).filter(Boolean),
      );
    }
  }, [boundaryData]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void fetchComplaintTypes(accessToken, user, t).then((types) => {
      const others = types.find((item) => item.key === "" || item.key === "Others");
      const remaining = types
        .filter((item) => item.key !== "" && item.key !== "Others")
        .sort((a, b) => a.name.localeCompare(b.name));
      if (others) {
        remaining.push(others);
      }
      setComplaintTypes(
        remaining.map((item) => ({
          code: item.key,
          key: item.key,
          name: item.name,
        })),
      );
    });
  }, [accessToken, user, t]);

  useEffect(() => {
    if (!form.complaintType?.key || !accessToken) {
      setSubTypes([]);
      return;
    }
    if (form.complaintType.key === "Others" || form.complaintType.key === "") {
      setSubTypes([{ code: "Others", key: "Others", name: t("SERVICEDEFS.OTHERS") }]);
      return;
    }
    void fetchComplaintSubTypes(accessToken, user, form.complaintType.key, t).then(
      (items) => {
        const others = items.find((item) => item.key === "Other");
        const remaining = items
          .filter((item) => item.key !== "Other")
          .sort((a, b) => a.name.localeCompare(b.name));
        if (others) {
          remaining.push(others);
        }
        setSubTypes(
          remaining.map((item) => ({
            code: item.key,
            key: item.key,
            name: item.name,
          })),
        );
      },
    );
  }, [accessToken, form.complaintType, t, user]);

  useEffect(() => {
    const key = form.complaintType?.key?.toUpperCase();
    if (key === "UNINSTALL") {
      setForm((prev) => ({
        ...prev,
        systemFunctionality: { code: "FUNCTIONAL", key: "FUNCTIONAL", name: t("Yes") },
        subType: {
          code: "UninstallSolarSystem",
          key: "UninstallSolarSystem",
          name: t("SERVICEDEFS.UNINSTALLSOLARSYSTEM"),
        },
      }));
    } else if (key === "REINSTALL") {
      setForm((prev) => ({
        ...prev,
        systemFunctionality: {
          code: "NON_FUNCTIONAL",
          key: "NON_FUNCTIONAL",
          name: t("No"),
        },
        subType: {
          code: "ReinstallSolarSystem",
          key: "ReinstallSolarSystem",
          name: t("SERVICEDEFS.REINSTALLSOLARSYSTEM"),
        },
      }));
    }
  }, [form.complaintType?.key, t]);

  useEffect(() => {
    if (isUninstalledFacility) {
      setForm((prev) => ({
        ...prev,
        complaintType: {
          code: "Reinstall",
          key: "Reinstall",
          name: t("SERVICEDEFS.REINSTALL"),
        },
      }));
    }
  }, [isUninstalledFacility, t]);

  useEffect(() => {
    if (!form.facility?.code || !form.complaintType?.key || !form.subType?.key) {
      setDuplicateTickets([]);
      return;
    }
    const jurisdiction = currentBoundary ?? { country: ["-"] };
    void searchPotentialDuplicates(
      employeeTenantId!,
      jurisdiction,
      form.facility.code,
      form.complaintType.key,
      form.subType.key,
      accessToken!,
      user,
    ).then(setDuplicateTickets);
  }, [
    accessToken,
    currentBoundary,
    employeeTenantId,
    form.complaintType,
    form.facility,
    form.subType,
    user,
  ]);

  const uploadFiles = useCallback(
    async (files: FileList, kind: UploadedMediaEntry["kind"]) => {
      if (!accessToken || !employeeTenantId) {
        return;
      }
      const setUploading =
        kind === "image"
          ? setIsImageUploading
          : kind === "video"
            ? setIsVideoUploading
            : setIsFirUploading;
      const setUploads =
        kind === "image"
          ? setImageUploads
          : kind === "video"
            ? setVideoUploads
            : setFirUploads;

      setUploading(true);
      try {
        const uploaded: UploadedMediaEntry[] = [];
        for (const file of Array.from(files)) {
          const result =
            kind === "video"
              ? await uploadIncidentVideo(file, employeeTenantId, accessToken)
              : await uploadIncidentFile(file, employeeTenantId, accessToken);
          uploaded.push({
            file,
            fileStoreId: result.fileStoreId,
            masterFileStoreId: result.masterFileStoreId,
            kind,
          });
        }
        setUploads((prev) => [...prev, ...uploaded]);
      } finally {
        setUploading(false);
      }
    },
    [accessToken, employeeTenantId],
  );

  const validate = useCallback(() => {
    const errors: FieldErrors = {};
    if (!form.district) {
      errors.district = translateOr(
        t,
        "INCIDENT_DISTRICT_REQUIRED",
        "Please select a district to continue",
      );
    }
    if (!form.block) {
      errors.block = translateOr(
        t,
        "INCIDENT_BLOCK_REQUIRED",
        "Please select a block to continue",
      );
    }
    if (!form.facility) {
      errors.facility = translateOr(
        t,
        "INCIDENT_FACILITY_REQUIRED",
        "Please select a facility to continue",
      );
    }
    if (!form.complaintType) {
      errors.complaintType = translateOr(
        t,
        "INCIDENT_TYPE_REQUIRED",
        "Please select an issue type to continue",
      );
    }
    if (!form.subType) {
      errors.subType = translateOr(
        t,
        "INCIDENT_SUBTYPE_REQUIRED",
        "Please select an issue sub type to continue",
      );
    }
    if (!form.systemFunctionality) {
      errors.systemFunctionality = translateOr(
        t,
        "INCIDENT_SYSTEM_FUNCTIONAL_REQUIRED",
        "Please select system functionality to continue",
      );
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, t]);

  const canSubmit = useMemo(() => {
    const hasMandatoryTheftUpload =
      !isTheftIssue || firUploads.some((upload) => upload.kind === "fir");
    return Boolean(
      form.complaintType &&
        form.subType &&
        form.systemFunctionality &&
        form.facility &&
        form.district &&
        form.block &&
        !isImageUploading &&
        !isVideoUploading &&
        !isFirUploading &&
        hasMandatoryTheftUpload,
    );
  }, [firUploads, form, isFirUploading, isImageUploading, isTheftIssue, isVideoUploading]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uuid || !accessToken || !employeeTenantId) {
        throw new Error("AUTH_REQUIRED");
      }
      if (!validate()) {
        throw new Error("VALIDATION_FAILED");
      }

      const uploadedDocuments = buildUploadedDocuments([
        ...imageUploads,
        ...videoUploads,
        ...firUploads,
      ]);

      return createIncident({
        tenantId: employeeTenantId,
        district: form.district!,
        block: form.block!,
        facility: form.facility!,
        complaintType: form.complaintType!,
        subType: form.subType!,
        systemFunctionality: form.systemFunctionality!,
        comments: form.comments,
        uploadedDocuments,
        user,
        accessToken,
      });
    },
    onSuccess: async (response) => {
      if (!response?.IncidentWrappers) {
        const message =
          response?.Errors?.[0]?.message ??
          response?.message ??
          t("CS_COMMON_SOMETHING_WENT_WRONG");
        setSubmitError(message);
        return;
      }
      sessionStorage.setItem(
        "livelihood-im-create-response",
        JSON.stringify(response),
      );
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      await queryClient.invalidateQueries({ queryKey: ["im-inbox"] });
      await queryClient.invalidateQueries({ queryKey: ["im-inbox-summary"] });
      void navigate({ to: responsePath });
    },
  });

  const clearForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setImageUploads([]);
    setVideoUploads([]);
    setFirUploads([]);
    setDisableUpload(true);
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  }, []);

  const saveDraft = useCallback(() => {
    sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        form,
        imageUploads: imageUploads.map((item) => item.fileStoreId),
        videoUploads: videoUploads.map((item) => item.fileStoreId),
      }),
    );
  }, [form, imageUploads, videoUploads]);

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const draft = JSON.parse(raw) as { form?: CreateIncidentFormValues };
      if (draft.form) {
        setForm({ ...EMPTY_FORM, ...draft.form });
      }
    } catch {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  const updateField = <K extends keyof CreateIncidentFormValues>(
    key: K,
    value: CreateIncidentFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleDistrictChange = (district: SelectOption | null) => {
    setForm((prev) => ({
      ...prev,
      district,
      block: null,
      facility: null,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      district: undefined,
      block: undefined,
      facility: undefined,
    }));
  };

  const handleBlockChange = (block: SelectOption | null) => {
    setForm((prev) => ({
      ...prev,
      block,
      facility: null,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      block: undefined,
      facility: undefined,
    }));
  };

  const handleFacilityChange = (facility: SelectOption | null) => {
    updateField("facility", facility);
    if (facility) {
      setDisableUpload(false);
    }
  };

  const handleComplaintTypeChange = (complaintType: SelectOption | null) => {
    const key = complaintType?.key?.toUpperCase();
    const isInstall = key === "UNINSTALL" || key === "REINSTALL";
    setForm((prev) => ({
      ...prev,
      complaintType,
      subType: isInstall ? prev.subType : null,
      systemFunctionality: isInstall ? prev.systemFunctionality : null,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      complaintType: undefined,
      subType: undefined,
      systemFunctionality: undefined,
    }));
    if (complaintType) {
      setDisableUpload(false);
    }
  };

  return {
    t,
    translateOr,
    form,
    updateField,
    fieldErrors,
    districtMenu,
    blockMenu,
    facilityMenu,
    complaintTypes,
    subTypes,
    systemOptions,
    imageUploads,
    videoUploads,
    firUploads,
    uploadFiles,
    isImageUploading,
    isVideoUploading,
    isFirUploading,
    disableUpload,
    setDisableUpload,
    isTheftIssue,
    isInstallationTicket,
    isUninstalledFacility,
    duplicateTickets,
    setDuplicateTickets,
    canSubmit,
    submitError,
    setSubmitError,
    createMutation,
    clearForm,
    saveDraft,
    validate,
    inboxPath,
    handleDistrictChange,
    handleBlockChange,
    handleFacilityChange,
    handleComplaintTypeChange,
  };
}
