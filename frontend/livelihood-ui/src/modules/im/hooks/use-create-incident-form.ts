import {
  useAuthStore,
  useJurisdictionStore,
  useTranslate,
} from "@/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { searchAssetsForFacility } from "../services/asset-search";
import { searchFacilitiesByJurisdiction } from "../services/facility-search";
import { uploadIncidentFile, uploadIncidentVideo } from "../services/file-upload";
import { createIncident, searchPotentialDuplicates } from "../services/incident";
import { fetchServiceDefsForMenuPath } from "../services/mdms";
import type {
  CreateIncidentFormValues,
  SelectOption,
  UploadedMediaEntry,
} from "../types/create-incident";
import type { LivelihoodAsset, LivelihoodFacility } from "../types/facility-asset";
import { buildUploadedDocuments } from "../utils/create-incident-documents";
import { buildFacilitySearchCriteria } from "../utils/jurisdiction-facility-criteria";

const DRAFT_STORAGE_KEY = "livelihood-im-create-draft";

interface FieldErrors {
  endUser?: string;
  asset?: string;
  complaintType?: string;
}

const EMPTY_FORM: CreateIncidentFormValues = {
  endUser: null,
  asset: null,
  complaintType: null,
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
  const boundaries = useJurisdictionStore((state) => state.boundaries);

  const [form, setForm] = useState<CreateIncidentFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [complaintTypes, setComplaintTypes] = useState<SelectOption[]>([]);
  const [imageUploads, setImageUploads] = useState<UploadedMediaEntry[]>([]);
  const [videoUploads, setVideoUploads] = useState<UploadedMediaEntry[]>([]);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [duplicateTickets, setDuplicateTickets] = useState<
    Array<{ ticketId: string; ticketTenantId: string }>
  >([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [disableUpload, setDisableUpload] = useState(true);

  const facilityCriteria = useMemo(
    () =>
      employeeTenantId
        ? buildFacilitySearchCriteria(boundaries, employeeTenantId)
        : null,
    [boundaries, employeeTenantId],
  );

  const facilitiesQuery = useQuery({
    queryKey: ["create-incident-facilities", facilityCriteria, accessToken],
    enabled: Boolean(accessToken && facilityCriteria),
    queryFn: () =>
      searchFacilitiesByJurisdiction(facilityCriteria!, accessToken!, user),
  });

  const facilities = facilitiesQuery.data?.facilities ?? [];
  const showEndUserDropdown = facilities.length !== 1;

  const assetsQuery = useQuery({
    queryKey: [
      "create-incident-assets",
      form.endUser?.facilityId,
      employeeTenantId,
      accessToken,
    ],
    enabled: Boolean(accessToken && employeeTenantId && form.endUser?.facilityId),
    queryFn: () =>
      searchAssetsForFacility(
        form.endUser!.facilityId,
        employeeTenantId!,
        accessToken!,
        user,
      ),
  });

  const assets = assetsQuery.data ?? [];

  const facilityById = useMemo(
    () => new Map(facilities.map((facility) => [facility.facilityId, facility])),
    [facilities],
  );

  const assetById = useMemo(
    () => new Map(assets.map((asset) => [asset.assetId, asset])),
    [assets],
  );

  const endUserOptions = useMemo(
    () =>
      facilities.map((facility) => ({
        code: facility.facilityId,
        name: facility.facilityPocName,
      })),
    [facilities],
  );

  const assetOptions = useMemo(
    () =>
      assets.map((asset) => ({
        code: asset.assetId,
        name: asset.serialNumber
          ? `${asset.name} (${asset.serialNumber})`
          : asset.name,
      })),
    [assets],
  );

  useEffect(() => {
    if (facilities.length !== 1 || form.endUser) {
      return;
    }
    const facility = facilities[0];
    setForm((prev) => ({
      ...prev,
      endUser: facility,
      asset: null,
      complaintType: null,
    }));
    setDisableUpload(false);
  }, [facilities, form.endUser]);

  useEffect(() => {
    if (!form.asset?.assetTypeId || !accessToken) {
      setComplaintTypes([]);
      return;
    }

    void fetchServiceDefsForMenuPath(
      accessToken,
      user,
      form.asset.assetTypeId,
      t,
    ).then((types) => {
      setComplaintTypes(
        types.map((item) => ({
          code: item.key,
          key: item.key,
          serviceCode: item.serviceCode,
          menuPath: item.menuPath,
          name: item.name,
        })),
      );
    });
  }, [accessToken, form.asset?.assetTypeId, t, user]);

  useEffect(() => {
    if (!form.endUser?.facilityId || !form.complaintType?.key) {
      setDuplicateTickets([]);
      return;
    }

    const jurisdiction = boundaries ?? { country: ["-"] };
    void searchPotentialDuplicates(
      employeeTenantId!,
      jurisdiction,
      form.endUser.facilityId,
      form.complaintType.key,
      accessToken!,
      user,
    ).then(setDuplicateTickets);
  }, [
    accessToken,
    boundaries,
    employeeTenantId,
    form.complaintType,
    form.endUser,
    user,
  ]);

  const uploadFiles = useCallback(
    async (files: FileList, kind: UploadedMediaEntry["kind"]) => {
      if (!accessToken || !employeeTenantId) {
        return;
      }
      const setUploading =
        kind === "image" ? setIsImageUploading : setIsVideoUploading;
      const setUploads = kind === "image" ? setImageUploads : setVideoUploads;

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
    if (!form.endUser) {
      errors.endUser = translateOr(
        t,
        "INCIDENT_END_USER_REQUIRED",
        "Please select an end user to continue",
      );
    }
    if (!form.asset) {
      errors.asset = translateOr(
        t,
        "INCIDENT_ASSET_REQUIRED",
        "Please select an asset to continue",
      );
    }
    if (!form.complaintType) {
      errors.complaintType = translateOr(
        t,
        "INCIDENT_TYPE_REQUIRED",
        "Please select an issue type to continue",
      );
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, t]);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.endUser &&
        form.asset &&
        form.complaintType &&
        !isImageUploading &&
        !isVideoUploading,
    );
  }, [form, isImageUploading, isVideoUploading]);

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
      ]);

      return createIncident({
        tenantId: employeeTenantId,
        endUser: form.endUser!,
        asset: form.asset!,
        complaintType: form.complaintType!,
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
    setComplaintTypes([]);
    setDisableUpload(facilities.length !== 1);
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    if (facilities.length === 1) {
      setForm({
        ...EMPTY_FORM,
        endUser: facilities[0],
      });
      setDisableUpload(false);
    }
  }, [facilities]);

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

  const handleEndUserChange = (facility: LivelihoodFacility | null) => {
    setForm((prev) => ({
      ...prev,
      endUser: facility,
      asset: null,
      complaintType: null,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      endUser: undefined,
      asset: undefined,
      complaintType: undefined,
    }));
    if (facility) {
      setDisableUpload(false);
    }
  };

  const handleAssetChange = (asset: LivelihoodAsset | null) => {
    setForm((prev) => ({
      ...prev,
      asset,
      complaintType: null,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      asset: undefined,
      complaintType: undefined,
    }));
  };

  const handleComplaintTypeChange = (complaintType: SelectOption | null) => {
    updateField("complaintType", complaintType);
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
    endUserOptions,
    assetOptions,
    facilityById,
    assetById,
    complaintTypes,
    showEndUserDropdown,
    isFacilitiesLoading: facilitiesQuery.isLoading,
    isAssetsLoading: assetsQuery.isLoading,
    imageUploads,
    videoUploads,
    uploadFiles,
    isImageUploading,
    isVideoUploading,
    disableUpload,
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
    handleEndUserChange,
    handleAssetChange,
    handleComplaintTypeChange,
  };
}
