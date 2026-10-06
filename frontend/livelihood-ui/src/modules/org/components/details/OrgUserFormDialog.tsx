import { extractApiErrorMessage, translateOr, useTranslate } from "@/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogScrim,
  DialogTitle,
  toast,
  useBodyScrollLock,
} from "@/ui";
import { useEffect } from "react";
import { useOrgRoleGroups } from "../../hooks/use-org-role-groups";
import { useOrgUserForm } from "../../hooks/use-org-user-form";
import { useCreateOrgUser, useUpdateOrgUser } from "../../hooks/use-org-users";
import type { Organisation, OrgUser } from "../../types/organisation";
import { PasswordField } from "../form/PasswordField";
import { RoleMultiSelect } from "../form/RoleMultiSelect";
import { TextField } from "../form/TextField";
import { JurisdictionSection } from "./JurisdictionSection";

interface OrgUserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation: Organisation;
  /** Present -> edit this user; absent -> add a new one. */
  user?: OrgUser;
}

export function OrgUserFormDialog({
  open,
  onOpenChange,
  organisation,
  user,
}: OrgUserFormDialogProps) {
  const { t } = useTranslate();
  const form = useOrgUserForm(user);
  const { groups, isLoading: isRolesLoading, rolesForGroups, groupsForRoleCodes } = useOrgRoleGroups(
    organisation.orgType,
  );
  const createUser = useCreateOrgUser(organisation.id);
  const updateUser = useUpdateOrgUser(organisation.id);
  const isPending = createUser.isPending || updateUser.isPending;
  const { values, fieldErrors, isEditing, updateField } = form;

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      form.reset(user ? groupsForRoleCodes(user.roleCodes).map((group) => group.name) : []);
    }
    // Only reset when the dialog opens (or role groups finish loading for an edit).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isRolesLoading]);

  function handleSubmit() {
    if (!form.validate()) {
      return;
    }
    const roles = rolesForGroups(values.roleGroups);
    const jurisdictions = form.toJurisdictions();

    if (user) {
      updateUser.mutate(
        {
          user,
          name: values.name,
          mobileNumber: values.mobileNumber,
          emailId: values.emailId || undefined,
          roles,
          jurisdictions,
          newPassword: values.password || undefined,
        },
        {
          onSuccess: () => {
            toast.success(translateOr(t, "ORGANIZATION_USER_UPDATION_SUCCESS", "User updated successfully"));
            onOpenChange(false);
          },
          onError: (error) => {
            toast.error(
              extractApiErrorMessage(error) ??
                translateOr(t, "ORGANIZATION_USER_UPDATION_FAILED", "Failed to update user"),
            );
          },
        },
      );
      return;
    }

    createUser.mutate(
      {
        organisationId: organisation.id,
        name: values.name,
        userName: values.userName,
        password: values.password,
        mobileNumber: values.mobileNumber,
        emailId: values.emailId || undefined,
        roles,
        jurisdictions,
      },
      {
        onSuccess: () => {
          toast.success(translateOr(t, "ORGANIZATION_USER_CREATION_SUCCESS", "User added successfully"));
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            extractApiErrorMessage(error) ??
              translateOr(t, "ORGANIZATION_USER_CREATION_FAILED", "Failed to add user"),
          );
        },
      },
    );
  }

  const passwordHint = translateOr(
    t,
    "ORG_PASSWORD_POLICY_HINT",
    "8–15 characters, with upper-case, lower-case, a number and one of @ # $ %",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogScrim open={open} onDismiss={() => onOpenChange(false)} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? translateOr(t, "EDIT_USER", "Edit User") : translateOr(t, "ADD_USER", "Add User")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={translateOr(t, "ORG_USER_NAME", "Name")}
            required
            value={values.name}
            error={fieldErrors.name}
            onChange={(value) => updateField("name", value)}
          />
          <TextField
            label={translateOr(t, "ORG_USER_USERNAME", "Username")}
            required 
            disabled={isEditing}
            autoComplete="off"
            value={values.userName}
            error={fieldErrors.userName}
            hint={
              isEditing
                ? translateOr(t, "ORG_USERNAME_LOCKED_HINT", "Username can't be changed after creation")
                : undefined
            }
            onChange={(value) => updateField("userName", value)}
          />
          <PasswordField
            label={
              isEditing
                ? translateOr(t, "ORG_NEW_PASSWORD", "New Password")
                : translateOr(t, "ORG_USER_PASSWORD", "Password")
            }
            required={!isEditing}
            value={values.password}
            error={fieldErrors.password}
            placeholder={
              isEditing ? translateOr(t, "ORG_PASSWORD_UNCHANGED_PLACEHOLDER", "Leave blank to keep current") : undefined
            }
            hint={passwordHint}
            onChange={(value) => updateField("password", value)}
          />
          <PasswordField
            label={translateOr(t, "ORG_CONFIRM_PASSWORD", "Confirm Password")}
            required={!isEditing || Boolean(values.password)}
            value={values.confirmPassword}
            error={fieldErrors.confirmPassword}
            onChange={(value) => updateField("confirmPassword", value)}
          />
          <TextField
            label={translateOr(t, "ORG_USER_CONTACT", "Contact")}
            required
            inputMode="numeric"
            maxLength={10}
            value={values.mobileNumber}
            error={fieldErrors.mobileNumber}
            onChange={(value) => updateField("mobileNumber", value.replace(/\D/g, ""))}
          />
          <TextField
            label={translateOr(t, "ORG_USER_EMAIL", "Email")}
            required
            type="email"
            value={values.emailId}
            error={fieldErrors.emailId}
            onChange={(value) => updateField("emailId", value)}
          />
          <div className="md:col-span-2">
            <RoleMultiSelect
              label={translateOr(t, "ORG_USER_ROLES", "Roles")}
              groups={groups}
              selected={values.roleGroups}
              isLoading={isRolesLoading}
              error={fieldErrors.roleGroups}
              onChange={(selected) => updateField("roleGroups", selected)}
            />
          </div>
        </div>

        {/* Unlike E4H (Super Admin only), Livelihood POCs also set their users' jurisdictions. */}
        <JurisdictionSection jurisdictions={form.jurisdictions} />

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </Button>
          <Button type="button" disabled={isPending} onClick={handleSubmit}>
            {isPending ? translateOr(t, "CORE_COMMON_SAVING", "Saving...") : translateOr(t, "CORE_COMMON_SAVE", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
