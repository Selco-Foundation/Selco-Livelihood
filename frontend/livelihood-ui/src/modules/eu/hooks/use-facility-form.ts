import { translateOr, useBoundaryHierarchy, useTranslate } from "@/shared";
import { useMemo, useState } from "react";
import { cascadeByParent, resolveBoundaryLabels } from "../utils/boundary";
import { useFacilityMdmsOptions } from "./use-facility-mdms-options";
import type { CreateFacilityPayload } from "../services/facility";
import type { Facility, FacilityFormValues } from "../types/facility";

const POC_NAME_PATTERN = /^[^"$<>?\\~`!@#%^()+={}[\]*,:;""'']*$/;
const NO_WHITESPACE_PATTERN = /^\S*$/;
const PHONE_PATTERN = /^[0-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LATITUDE_PATTERN = /^-?(90(\.0+)?|[1-8]?\d(\.\d+)?)$/;
const LONGITUDE_PATTERN = /^-?(180(\.0+)?|1[0-7]\d(\.\d+)?|\d{1,2}(\.\d+)?)$/;

export interface FacilityFieldErrors {
  state?: string;
  district?: string;
  block?: string;
  facilityName?: string;
  facilityCategory?: string;
  facilityType?: string;
  pocName?: string;
  pocUsername?: string;
  pocPhone?: string;
  pocEmail?: string;
  latitude?: string;
  longitude?: string;
}

const EMPTY_VALUES: FacilityFormValues = {
  state: "",
  district: "",
  block: "",
  facilityName: "",
  facilityCategory: "",
  facilityType: "",
  solarSolutionDesignType: "",
  pocName: "",
  pocUsername: "",
  pocPhone: "",
  pocEmail: "",
  isOperational: true,
  isOnmReady: true,
  latitude: "",
  longitude: "",
};

/**
 * Form state + validation + cascading dependent-field logic for creating (and
 * later, editing) a facility. HEALTH-category facilities (HFR ID / NIN ID /
 * POC-username exemption) aren't supported here.
 * `editingFacilityId`, when set, locks state/district/block/category/username
 * once a facility already exists — this same hook backs both the create form
 * and the facility-detail edit form.
 */
export function useFacilityForm(editingFacilityId?: string) {
  const { t } = useTranslate();
  const [values, setValues] = useState<FacilityFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FacilityFieldErrors>({});

  const { data: boundaryData, isLoading: isBoundaryLoading } = useBoundaryHierarchy();
  const { facilityCategories, facilityTypes, solarSolutionDesignTypes, isLoading: isMdmsLoading } =
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
    if (!values.facilityName.trim()) errors.facilityName = required;
    if (!values.facilityCategory) errors.facilityCategory = required;
    if (!values.facilityType) errors.facilityType = required;

    if (!values.pocName.trim()) {
      errors.pocName = required;
    } else if (!POC_NAME_PATTERN.test(values.pocName)) {
      errors.pocName = translateOr(
        t,
        "FACILITY_POC_NAME_VALIDATION_ERROR",
        "Name contains invalid characters",
      );
    }

    if (!values.pocUsername.trim()) {
      errors.pocUsername = required;
    } else if (!NO_WHITESPACE_PATTERN.test(values.pocUsername)) {
      errors.pocUsername = translateOr(
        t,
        "FACILITY_POC_USERNAME_VALIDATION_ERROR",
        "Username cannot contain spaces",
      );
    }

    if (!values.pocPhone.trim()) {
      errors.pocPhone = required;
    } else if (!PHONE_PATTERN.test(values.pocPhone)) {
      errors.pocPhone = translateOr(
        t,
        "FACILITY_POC_PHONE_VALIDATION_ERROR",
        "Enter a valid 10-digit phone number",
      );
    }

    if (values.pocEmail.trim() && !EMAIL_PATTERN.test(values.pocEmail)) {
      errors.pocEmail = translateOr(t, "CS_PROFILE_EMAIL_ERRORMSG", "Enter a valid email address");
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
    return {
      tenant_id: tenantId,
      facility_name: values.facilityName.trim(),
      facility_category: values.facilityCategory,
      facility_type: values.facilityType,
      isActive: values.isOperational,
      isOnmReady: values.isOnmReady,
      blockBoundaryCode: values.block,
      address: {
        tenantId,
        ...(values.latitude.trim() ? { latitude: Number.parseFloat(values.latitude) } : {}),
        ...(values.longitude.trim() ? { longitude: Number.parseFloat(values.longitude) } : {}),
      },
      facility_poc_name: values.pocName.trim(),
      facility_poc_username: values.pocUsername.trim(),
      facility_poc_phone: values.pocPhone.trim(),
      ...(values.pocEmail.trim() ? { facility_poc_email: values.pocEmail.trim() } : {}),
      facility_details: {
        ...(values.solarSolutionDesignType ? { solar_solution_design_type: values.solarSolutionDesignType } : {}),
      },
    };
  }

  /**
   * The update-request payload — spreads the facility's raw, untransformed
   * record first so unedited fields (id, boundary code, POC username, etc.,
   * all disabled in edit mode) are preserved. No `facility_poc_username` or
   * `blockBoundaryCode` override is sent — those two are immutable once a
   * facility exists.
   */
  function toUpdatePayload(raw: Record<string, unknown>, tenantId: string): Record<string, unknown> {
    return {
      ...raw,
      tenant_id: tenantId,
      facility_name: values.facilityName.trim(),
      facility_category: values.facilityCategory,
      facility_type: values.facilityType,
      isActive: values.isOperational,
      isOnmReady: values.isOnmReady,
      address: {
        tenantId,
        ...(values.latitude.trim() ? { latitude: Number.parseFloat(values.latitude) } : {}),
        ...(values.longitude.trim() ? { longitude: Number.parseFloat(values.longitude) } : {}),
      },
      facility_poc_name: values.pocName.trim(),
      facility_poc_phone: values.pocPhone.trim(),
      ...(values.pocEmail.trim() ? { facility_poc_email: values.pocEmail.trim() } : {}),
      facility_details: {
        ...(values.solarSolutionDesignType ? { solar_solution_design_type: values.solarSolutionDesignType } : {}),
      },
    };
  }

  function reset(facility?: Facility) {
    setFieldErrors({});
    if (!facility) {
      setValues(EMPTY_VALUES);
      return;
    }
    const boundaryLabels = resolveBoundaryLabels(facility.boundaryCode, boundaryData);
    setValues({
      state: boundaryLabels.state ?? "",
      district: boundaryLabels.district ?? "",
      block: boundaryLabels.block ?? "",
      facilityName: facility.facilityName ?? "",
      facilityCategory: facility.facilityCategory ?? "",
      facilityType: facility.facilityType ?? "",
      solarSolutionDesignType: facility.solarSolutionDesignType ?? "",
      pocName: facility.pocName ?? "",
      pocUsername: facility.pocUsername ?? "",
      pocPhone: facility.pocPhone ?? "",
      pocEmail: facility.pocEmail ?? "",
      isOperational: facility.isActive ?? true,
      isOnmReady: facility.isActive === false ? false : (facility.isOnmReady ?? true),
      latitude: facility.latitude !== undefined ? String(facility.latitude) : "",
      longitude: facility.longitude !== undefined ? String(facility.longitude) : "",
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
    solarSolutionDesignTypes,
    updateField,
    validate,
    toPayload,
    toUpdatePayload,
    reset,
  };
}
