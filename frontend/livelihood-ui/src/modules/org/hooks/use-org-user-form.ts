import { translateOr, useTranslate } from "@/shared";
import { useState } from "react";
import type { OrgJurisdiction, OrgUser } from "../types/organisation";
import {
  draftToJurisdiction,
  emptyJurisdictionDraft,
  updateDraftLevel,
  type JurisdictionDraft,
  type JurisdictionLevel,
} from "../utils/boundary";
import {
  validateOptionalEmail,
  validatePassword,
  validatePersonName,
  validatePhone,
  validateUsername,
} from "../utils/validation";

export interface OrgUserFormValues {
  name: string;
  userName: string;
  password: string;
  confirmPassword: string;
  mobileNumber: string;
  emailId: string;
  roleGroups: string[];
}

export type OrgUserFieldErrors = Partial<Record<keyof OrgUserFormValues, string>>;

const EMPTY_VALUES: OrgUserFormValues = {
  name: "",
  userName: "",
  password: "",
  confirmPassword: "",
  mobileNumber: "",
  emailId: "",
  roleGroups: [],
};

/**
 * Add/Edit org user form state. Password is mandatory on add; on edit a blank
 * password means "leave unchanged". Username is fixed once the user exists.
 *
 * Jurisdictions (jurisdictions) are optional, as in E4H: new ones are cascading
 * drafts; existing ones can be removed (sent back as inactive) or restored.
 */
export function useOrgUserForm(editing?: OrgUser) {
  const { t } = useTranslate();
  const [values, setValues] = useState<OrgUserFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<OrgUserFieldErrors>({});
  const [drafts, setDrafts] = useState<JurisdictionDraft[]>([]);
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [removedJurisdictionIds, setRemovedJurisdictionIds] = useState<string[]>([]);
  const isEditing = Boolean(editing);

  /** Jurisdictions already saved and active on the user — the ones shown in the "current" list. */
  const existingJurisdictions = (editing?.jurisdictions ?? []).filter((item) => item.isActive && item.id);

  function updateField<K extends keyof OrgUserFormValues>(field: K, value: OrgUserFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function addDraft() {
    setDrafts((prev) => [...prev, emptyJurisdictionDraft()]);
  }

  function updateDraft(key: string, level: JurisdictionLevel, code: string) {
    setDrafts((prev) => prev.map((draft) => (draft.key === key ? updateDraftLevel(draft, level, code) : draft)));
    setDraftErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((draft) => draft.key !== key));
    setDraftErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function toggleExisting(id: string) {
    setRemovedJurisdictionIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function validateDrafts(): Record<string, string> {
    const errors: Record<string, string> = {};
    const taken = new Set(
      existingJurisdictions
        .filter((item) => !removedJurisdictionIds.includes(item.id!))
        .map((item) => item.boundary),
    );
    for (const draft of drafts) {
      const jurisdiction = draftToJurisdiction(draft);
      if (!jurisdiction) {
        errors[draft.key] = translateOr(t, "ORG_JURISDICTION_EMPTY", "Select at least a country, or remove this jurisdiction");
      } else if (taken.has(jurisdiction.boundary)) {
        errors[draft.key] = translateOr(t, "ORG_JURISDICTION_DUPLICATE", "This boundary is already in the user's jurisdiction");
      } else {
        taken.add(jurisdiction.boundary);
      }
    }
    return errors;
  }

  function validate(): boolean {
    const errors: OrgUserFieldErrors = {};
    errors.name = validatePersonName(values.name, t);
    if (!isEditing) errors.userName = validateUsername(values.userName, t);
    const passwordErrors = validatePassword(values.password, values.confirmPassword, t, !isEditing);
    errors.password = passwordErrors.password;
    errors.confirmPassword = passwordErrors.confirmPassword;
    errors.mobileNumber = validatePhone(values.mobileNumber, t);
    errors.emailId = validateOptionalEmail(values.emailId, t);
    if (values.roleGroups.length === 0) {
      errors.roleGroups = translateOr(t, "USER_CREATION_SELECT_ROLE_ERROR", "Select at least one role");
    }
    const jurisdictionErrors = validateDrafts();

    setFieldErrors(errors);
    setDraftErrors(jurisdictionErrors);
    return Object.values(errors).every((error) => !error) && Object.keys(jurisdictionErrors).length === 0;
  }

  /**
   * The jurisdiction list to send: every jurisdiction already on the user (with
   * removed ones switched to inactive), followed by the new ones.
   */
  function toJurisdictions(): OrgJurisdiction[] {
    const existing = (editing?.jurisdictions ?? []).map((item) =>
      item.id && removedJurisdictionIds.includes(item.id) ? { ...item, isActive: false } : item,
    );
    const added = drafts.map(draftToJurisdiction).filter((item): item is OrgJurisdiction => item !== null);
    return [...existing, ...added];
  }

  function reset(initialRoleGroups: string[] = []) {
    setFieldErrors({});
    setDrafts([]);
    setDraftErrors({});
    setRemovedJurisdictionIds([]);
    setValues(
      editing
        ? {
            ...EMPTY_VALUES,
            name: editing.name,
            userName: editing.userName,
            mobileNumber: editing.mobileNumber,
            emailId: editing.emailId ?? "",
            roleGroups: initialRoleGroups,
          }
        : EMPTY_VALUES,
    );
  }

  return {
    values,
    fieldErrors,
    isEditing,
    updateField,
    validate,
    reset,
    jurisdictions: {
      existing: existingJurisdictions,
      removedIds: removedJurisdictionIds,
      drafts,
      draftErrors,
      addDraft,
      updateDraft,
      removeDraft,
      toggleExisting,
    },
    toJurisdictions,
  };
}
