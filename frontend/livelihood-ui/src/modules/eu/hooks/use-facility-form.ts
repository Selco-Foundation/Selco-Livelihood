import { translateOr, useBoundaryHierarchy, useTranslate } from "@/shared";
import { useMemo, useState } from "react";
import { cascadeByParent } from "../utils/boundary";
import { useFacilityMdmsOptions } from "./use-facility-mdms-options";
import type { CreateFacilityPayload } from "../services/facility";
import type { Facility, FacilityFormValues } from "../types/facility";

const END_USER_NAME_PATTERN = /^[^"$<>?\\~`!@#%^()+={}[\]*,:;""'']*$/;
const NO_WHITESPACE_PATTERN = /^\S*$/;
const PHONE_PATTERN = /^[0-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LATITUDE_PATTERN = /^-?(90(\.0+)?|[1-8]?\d(\.\d+)?)$/;
const LONGITUDE_PATTERN = /^-?(180(\.0+)?|1[0-7]\d(\.\d+)?|\d{1,2}(\.\d+)?)$/;

export interface FacilityFieldErrors {
  state?: string;
  district?: string;
  block?: string;
  endUserName?: string;
  facilityCategory?: string;
  facilityType?: string;
  endUserUsername?: string;
  endUserPhone?: string;
  endUserEmail?: string;
  latitude?: string;
  longitude?: string;
  confirmPassword?: string;
}

const EMPTY_VALUES: FacilityFormValues = {
  state: "",
  district: "",
  block: "",
  endUserName: "",
  facilityCategory: "",
  facilityType: "",
  endUserType: "",
  endUserUsername: "",
  endUserPhone: "",
  endUserEmail: "",
  misId: "",
  isOperational: true,
  isOnmReady: true,
  latitude: "",
  longitude: "",
  password: "",
  confirmPassword: "",
};

/**
 * Form state + validation + cascading dependent-field logic for creating (and
 * later, editing) a facility. HEALTH-category facilities (HFR ID / NIN ID /
 * username exemption) aren't supported here.
 * `editingFacilityId`, when set, locks state/district/block/category/username
 * once a facility already exists — this same hook backs both the create form
 * and the facility-detail edit form.
 */
export function useFacilityForm(editingFacilityId?: string) {
  const { t } = useTranslate();
  const [values, setValues] = useState<FacilityFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FacilityFieldErrors>({});

  const { data: boundaryData, isLoading: isBoundaryLoading } = useBoundaryHierarchy();
  const { facilityCategories, facilityTypes, endUserTypes, isLoading: isMdmsLoading } =
    useFacilityMdmsOptions();

  const states = boundaryData?.states ?? [];
  const districts = cascadeByParent(boundaryData?.districts ?? [], values.state ? [values.state] : []);
  const blocks = cascadeByParent(boundaryData?.blocks ?? [], values.district ? [values.district] : []);
  const facilityTypeOptions = useMemo(
    () => facilityTypes.filter((type) => type.facilityCategory === values.facilityCategory),
    [facilityTypes, values.facilityCategory],
  );

  const isEditing = Boolean(editingFacilityId);
  const isLoading = isBoundaryLoading || isMdmsLoading;

  function updateField<K extends keyof FacilityFormValues>(field: K, value: FacilityFormValues[K]) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "state") {
        next.district = "";
        next.block = "";
      } else if (field === "district") {
        next.block = "";
      } else if (field === "facilityCategory") {
        next.facilityType = "";
      } else if (field === "isOperational" && value === false) {
        next.isOnmReady = false;
      }

      return next;
    });
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const required = translateOr(t, "CORE_COMMON_REQUIRED", "Required");
    const errors: FacilityFieldErrors = {};

    if (!values.state) errors.state = required;
    if (!values.district) errors.district = required;
    if (!values.block) errors.block = required;
    if (!values.facilityCategory) errors.facilityCategory = required;
    if (!values.facilityType) errors.facilityType = required;

    if (!values.endUserName.trim()) {
      errors.endUserName = required;
    } else if (!END_USER_NAME_PATTERN.test(values.endUserName)) {
      errors.endUserName = translateOr(
        t,
        "FACILITY_POC_NAME_VALIDATION_ERROR",
        "Name contains invalid characters",
      );
    }

    if (!values.endUserUsername.trim()) {
      errors.endUserUsername = required;
    } else if (!NO_WHITESPACE_PATTERN.test(values.endUserUsername)) {
      errors.endUserUsername = translateOr(
        t,
        "FACILITY_POC_USERNAME_VALIDATION_ERROR",
        "Username cannot contain spaces",
      );
    }

    if (!values.endUserPhone.trim()) {
      errors.endUserPhone = required;
    } else if (!PHONE_PATTERN.test(values.endUserPhone)) {
      errors.endUserPhone = translateOr(
        t,
        "FACILITY_POC_PHONE_VALIDATION_ERROR",
        "Enter a valid 10-digit phone number",
      );
    }

    if (values.endUserEmail.trim() && !EMAIL_PATTERN.test(values.endUserEmail)) {
      errors.endUserEmail = translateOr(t, "CS_PROFILE_EMAIL_ERRORMSG", "Enter a valid email address");
    }

    if (values.password.trim() && values.password !== values.confirmPassword) {
      errors.confirmPassword = translateOr(t, "FACILITY_PASSWORD_MISMATCH", "Passwords do not match");
    }

    if (values.latitude.trim() && !LATITUDE_PATTERN.test(values.latitude)) {
      errors.latitude = translateOr(
        t,
        "FACILITY_LATITUDE_VALIDATION_ERROR",
        "Enter a valid latitude (-90 to 90)",
      );
    }

    if (values.longitude.trim() && !LONGITUDE_PATTERN.test(values.longitude)) {
      errors.longitude = translateOr(
        t,
        "FACILITY_LONGITUDE_VALIDATION_ERROR",
        "Enter a valid longitude (-180 to 180)",
      );
    }

    setFieldErrors(errors);
    return Object.values(errors).every((error) => !error);
  }

  function toPayload(tenantId: string): CreateFacilityPayload {
    const endUserName = values.endUserName.trim();
    return {
      tenant_id: tenantId,
      facility_name: endUserName,
      facility_category: values.facilityCategory,
      facility_type: values.facilityType,
      isActive: values.isOperational,
      isOnmReady: values.isOnmReady,
      ...(values.endUserType ? { endUserType: values.endUserType } : {}),
      blockBoundaryCode: values.block,
      address: {
        tenantId,
        ...(values.latitude.trim() ? { latitude: Number.parseFloat(values.latitude) } : {}),
        ...(values.longitude.trim() ? { longitude: Number.parseFloat(values.longitude) } : {}),
      },
      facility_poc_name: endUserName,
      facility_poc_username: values.endUserUsername.trim(),
      facility_poc_phone: values.endUserPhone.trim(),
      ...(values.endUserEmail.trim() ? { facility_poc_email: values.endUserEmail.trim() } : {}),
      ...(values.password.trim() ? { endUserPassword: values.password.trim() } : {}),
      ...(values.misId.trim() ? { additionalDetails: { misId: values.misId.trim() } } : {}),
      facility_details: {},
    };
  }

  /**
   * The update-request payload — spreads the facility's raw, untransformed
   * record first so unedited fields (id, boundary code, username, etc.,
   * all disabled in edit mode) are preserved. No `facility_poc_username` or
   * `blockBoundaryCode` override is sent — those two are immutable once a
   * facility exists.
   */
  function toUpdatePayload(raw: Record<string, unknown>, tenantId: string): Record<string, unknown> {
    const endUserName = values.endUserName.trim();
    return {
      ...raw,
      tenant_id: tenantId,
      facility_name: endUserName,
      facility_category: values.facilityCategory,
      facility_type: values.facilityType,
      isActive: values.isOperational,
      isOnmReady: values.isOnmReady,
      ...(values.endUserType ? { endUserType: values.endUserType } : {}),
      address: {
        ...((raw.address as Record<string, unknown> | undefined) ?? {}),
        tenantId,
        ...(values.latitude.trim() ? { latitude: Number.parseFloat(values.latitude) } : {}),
        ...(values.longitude.trim() ? { longitude: Number.parseFloat(values.longitude) } : {}),
      },
      facility_poc_name: endUserName,
      facility_poc_phone: values.endUserPhone.trim(),
      ...(values.endUserEmail.trim() ? { facility_poc_email: values.endUserEmail.trim() } : {}),
      ...(values.password.trim() ? { endUserPassword: values.password.trim() } : {}),
      ...(values.misId.trim()
        ? {
            additionalDetails: {
              ...((raw.additionalDetails as Record<string, unknown> | undefined) ?? {}),
              misId: values.misId.trim(),
            },
          }
        : {}),
      facility_details: {},
    };
  }

  function reset(facility?: Facility) {
    setFieldErrors({});
    if (!facility) {
      setValues(EMPTY_VALUES);
      return;
    }
    setValues({
      state: facility.stateCode ?? "",
      district: facility.districtCode ?? "",
      block: facility.blockCode ?? "",
      endUserName: facility.facilityName ?? facility.pocName ?? "",
      facilityCategory: facility.facilityCategory ?? "",
      facilityType: facility.facilityType ?? "",
      endUserType: facility.endUserType ?? "",
      endUserUsername: facility.pocUsername ?? "",
      endUserPhone: facility.pocPhone ?? "",
      endUserEmail: facility.pocEmail ?? "",
      misId: facility.misId ?? "",
      isOperational: facility.isActive ?? true,
      isOnmReady: facility.isActive === false ? false : (facility.isOnmReady ?? true),
      latitude: facility.latitude !== undefined ? String(facility.latitude) : "",
      longitude: facility.longitude !== undefined ? String(facility.longitude) : "",
      password: "",
      confirmPassword: "",
    });
  }

  return {
    values,
    fieldErrors,
    isLoading,
    isEditing,
    states,
    districts,
    blocks,
    facilityCategories,
    facilityTypeOptions,
    endUserTypes,
    updateField,
    validate,
    toPayload,
    toUpdatePayload,
    reset,
  };
}
