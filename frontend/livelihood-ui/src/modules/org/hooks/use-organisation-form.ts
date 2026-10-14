import { translateOr, useTranslate } from "@/shared";
import { useState } from "react";
import type {
  CreateOrganisationInput,
  Organisation,
  OrgStatus,
  OrgType,
  UpdateOrganisationInput,
} from "../types/organisation";
import {
  requiredMessage,
  validateOptionalEmail,
  validatePassword,
  validatePersonName,
  validatePhone,
  validateUsername,
} from "../utils/validation";

export interface OrganisationFormValues {
  name: string;
  status: string;
  pocName: string;
  pocPhone: string;
  pocEmail: string;
  pocUsername: string;
  pocPassword: string;
  pocConfirmPassword: string;
}

export type OrganisationFieldErrors = Partial<Record<keyof OrganisationFormValues, string>>;

const EMPTY_VALUES: OrganisationFormValues = {
  name: "",
  status: "ACTIVE",
  pocName: "",
  pocPhone: "",
  pocEmail: "",
  pocUsername: "",
  pocPassword: "",
  pocConfirmPassword: "",
};

/**
 * Add/Edit Organisation form state. On edit, the PoC username and password
 * aren't editable here — the PoC is an ordinary org user afterwards, managed
 * (including password) from the user table.
 */
export function useOrganisationForm(orgType: OrgType, editing?: Organisation) {
  const { t } = useTranslate();
  const [values, setValues] = useState<OrganisationFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<OrganisationFieldErrors>({});
  const isEditing = Boolean(editing);

  function updateField<K extends keyof OrganisationFormValues>(field: K, value: OrganisationFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const errors: OrganisationFieldErrors = {};
    const name = values.name.trim();
    if (!name) {
      errors.name = requiredMessage(t);
    } else if (name.length < 2 || name.length > 128) {
      errors.name = translateOr(t, "ORG_NAME_LENGTH_ERROR", "Name must be 2–128 characters");
    }
    if (!values.status) errors.status = requiredMessage(t);
    errors.pocName = validatePersonName(values.pocName, t);
    errors.pocPhone = validatePhone(values.pocPhone, t);
    errors.pocEmail = validateOptionalEmail(values.pocEmail, t);

    if (!isEditing) {
      errors.pocUsername = validateUsername(values.pocUsername, t);
      const passwordErrors = validatePassword(values.pocPassword, values.pocConfirmPassword, t, true);
      errors.pocPassword = passwordErrors.password;
      errors.pocConfirmPassword = passwordErrors.confirmPassword;
    }

    setFieldErrors(errors);
    return Object.values(errors).every((error) => !error);
  }

  function toCreateInput(): CreateOrganisationInput {
    return {
      orgType,
      name: values.name.trim(),
      status: values.status as OrgStatus,
      pocName: values.pocName.trim(),
      pocPhone: values.pocPhone.trim(),
      pocEmail: values.pocEmail.trim() || undefined,
      pocUsername: values.pocUsername.trim(),
      pocPassword: values.pocPassword,
    };
  }

  function toUpdateInput(): UpdateOrganisationInput {
    return {
      name: values.name.trim(),
      status: values.status,
      pocName: values.pocName.trim(),
      pocPhone: values.pocPhone.trim(),
      pocEmail: values.pocEmail.trim() || undefined,
    };
  }

  function reset() {
    setFieldErrors({});
    setValues(
      editing
        ? {
            ...EMPTY_VALUES,
            name: editing.name,
            status: editing.status,
            pocName: editing.pocName ?? "",
            pocPhone: editing.pocPhone ?? "",
            pocEmail: editing.pocEmail ?? "",
            pocUsername: editing.pocUsername ?? "",
          }
        : EMPTY_VALUES,
    );
  }

  return { values, fieldErrors, isEditing, updateField, validate, toCreateInput, toUpdateInput, reset };
}
