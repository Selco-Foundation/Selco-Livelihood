import { translateOr, useBoundaryHierarchy, useTranslate } from "@/shared";
import { useState } from "react";
import { cascadeByParent } from "../utils/boundary";
import type { BoundaryFormValues, LgdBlockTier } from "../types/boundary";

const EMPTY_LGD = { lgdStateCode: "", lgdDistrictCode: "", lgdBlockCode: "", lgdBlockTier: "Block" as LgdBlockTier };
const EMPTY_VALUES: BoundaryFormValues = { state: "", district: "", block: "", ...EMPTY_LGD };

/** LGD codes are numeric, and boundary.lgd_* columns hold at most 16 characters. */
export const LGD_CODE_MAX_LENGTH = 16;

function toLgdCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, LGD_CODE_MAX_LENGTH);
}

export interface BoundaryFieldErrors {
  state?: string;
  district?: string;
  block?: string;
}

/**
 * Form state for creating a boundary: State/District can either be picked
 * from the existing hierarchy or typed as a brand-new name (toggled
 * independently, except typing a new State forces District into text mode
 * too, since a district can't be picked under a state that doesn't exist
 * yet). Block is always free text — there's no existing-block dropdown here.
 */
export function useBoundaryForm() {
  const { t } = useTranslate();
  const [values, setValues] = useState<BoundaryFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<BoundaryFieldErrors>({});
  const [isStateTextMode, setIsStateTextMode] = useState(false);
  const [isDistrictTextMode, setIsDistrictTextMode] = useState(false);

  const { data: boundaryData, isLoading } = useBoundaryHierarchy();

  const states = boundaryData?.states ?? [];
  const districts = cascadeByParent(boundaryData?.districts ?? [], values.state ? [values.state] : []);

  function toggleStateMode() {
    const next = !isStateTextMode;
    setValues(EMPTY_VALUES);
    setIsStateTextMode(next);
    if (next) {
      setIsDistrictTextMode(true);
    }
    setFieldErrors({});
  }

  function toggleDistrictMode() {
    if (isStateTextMode) {
      return;
    }
    setIsDistrictTextMode((prev) => !prev);
    setValues((prev) => ({ ...prev, district: "", block: "" }));
    setFieldErrors((prev) => ({ ...prev, district: undefined, block: undefined }));
  }

  function updateState(value: string) {
    setValues((prev) => ({ ...EMPTY_VALUES, state: value, lgdStateCode: prev.lgdStateCode }));
    setFieldErrors((prev) => ({ ...prev, state: undefined, district: undefined, block: undefined }));
  }

  function updateDistrict(value: string) {
    setValues((prev) => ({ ...prev, district: value, block: "" }));
    setFieldErrors((prev) => ({ ...prev, district: undefined, block: undefined }));
  }

  function updateBlock(value: string) {
    setValues((prev) => ({ ...prev, block: value }));
    setFieldErrors((prev) => ({ ...prev, block: undefined }));
  }

  /** Non-digits are dropped as they are typed, so the field can only ever hold a valid code. */
  function updateLgdCode(field: "lgdStateCode" | "lgdDistrictCode" | "lgdBlockCode", value: string) {
    setValues((prev) => ({ ...prev, [field]: toLgdCode(value) }));
  }

  function updateLgdBlockTier(value: LgdBlockTier) {
    setValues((prev) => ({ ...prev, lgdBlockTier: value }));
  }

  function validate(): boolean {
    const required = translateOr(t, "CORE_COMMON_REQUIRED", "Required");
    const errors: BoundaryFieldErrors = {};
    if (!values.state.trim()) errors.state = required;
    if (!values.district.trim()) errors.district = required;
    if (!values.block.trim()) errors.block = required;
    setFieldErrors(errors);
    return Object.values(errors).every((error) => !error);
  }

  function reset() {
    setValues(EMPTY_VALUES);
    setFieldErrors({});
    setIsStateTextMode(false);
    setIsDistrictTextMode(false);
  }

  return {
    values,
    fieldErrors,
    isLoading,
    isStateTextMode,
    isDistrictTextMode,
    states,
    districts,
    toggleStateMode,
    toggleDistrictMode,
    updateState,
    updateDistrict,
    updateBlock,
    updateLgdCode,
    updateLgdBlockTier,
    validate,
    reset,
  };
}
