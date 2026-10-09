import { translateOr, useTranslate } from "@/shared";
import { useOrganisationForm } from "../../hooks/use-organisation-form";
import { ORG_STATUSES, type OrgType } from "../../types/organisation";
import { FormSelectField, type SelectOption } from "../form/FormSelectField";
import { PasswordField } from "../form/PasswordField";
import { TextField } from "../form/TextField";
import { orgStatusLabel } from "../OrgStatusBadge";

interface OrganisationFormProps {
  orgType: OrgType;
  form: ReturnType<typeof useOrganisationForm>;
}

/** Presentational half of Add/Edit Organisation — state lives in `useOrganisationForm`. */
export function OrganisationForm({ orgType, form }: OrganisationFormProps) {
  const { t } = useTranslate();
  const { values, fieldErrors, isEditing, updateField } = form;

  const statusOptions: SelectOption[] = ORG_STATUSES.map((status) => ({
    code: status,
    name: orgStatusLabel(status, t),
  }));
  const orgTypeLabel =
    orgType === "PLATFORM"
      ? translateOr(t, "ORGANIZATION_TYPE_PLATFORM", "Platform Organisation")
      : translateOr(t, "ORGANIZATION_TYPE_VENDOR", "Vendor Organisation");

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h3 className="text-base font-semibold text-foreground">
          {translateOr(t, "ORG_DETAILS_SECTION", "Organisation Details")}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={translateOr(t, "ORG_NAME", "Organisation Name")}
            required
            maxLength={128}
            value={values.name}
            error={fieldErrors.name}
            onChange={(value) => updateField("name", value)}
          />
          <div className="min-w-0 space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {translateOr(t, "ORG_TYPE", "Organisation Type")}
            </span>
            <p className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
              {orgTypeLabel}
            </p>
          </div>
          <FormSelectField
            label={translateOr(t, "ORG_STATUS", "Status")}
            required
            value={values.status}
            options={statusOptions}
            // Active on create; can be changed only once the organisation exists.
            disabled={!isEditing}
            error={fieldErrors.status}
            onChange={(option) => updateField("status", option?.code ?? "ACTIVE")}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-base font-semibold text-foreground">
          {translateOr(t, "ORG_POC_SECTION", "Point of Contact")}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={translateOr(t, "ORG_POC_NAME", "PoC Name")}
            required
            value={values.pocName}
            error={fieldErrors.pocName}
            onChange={(value) => updateField("pocName", value)}
          />
          <TextField
            label={translateOr(t, "ORG_POC_PHONE", "PoC Contact")}
            required
            inputMode="numeric"
            maxLength={10}
            value={values.pocPhone}
            error={fieldErrors.pocPhone}
            onChange={(value) => updateField("pocPhone", value.replace(/\D/g, ""))}
          />
          <TextField
            label={translateOr(t, "ORG_POC_EMAIL", "PoC Email")}
            type="email"
            value={values.pocEmail}
            error={fieldErrors.pocEmail}
            onChange={(value) => updateField("pocEmail", value)}
          />
          <TextField
            label={translateOr(t, "ORG_POC_USERNAME", "PoC Username")}
            required={!isEditing}
            disabled={isEditing}
            autoComplete="off"
            value={values.pocUsername}
            error={fieldErrors.pocUsername}
            hint={
              isEditing
                ? translateOr(t, "ORG_POC_USERNAME_LOCKED_HINT", "Username can't be changed after creation")
                : undefined
            }
            onChange={(value) => updateField("pocUsername", value)}
          />
          {!isEditing ? (
            <>
              <PasswordField
                label={translateOr(t, "ORG_POC_PASSWORD", "PoC Password")}
                required
                value={values.pocPassword}
                error={fieldErrors.pocPassword}
                hint={translateOr(
                  t,
                  "ORG_PASSWORD_POLICY_HINT",
                  "8–15 characters, with upper-case, lower-case, a number and one of @ # $ %",
                )}
                onChange={(value) => updateField("pocPassword", value)}
              />
              <PasswordField
                label={translateOr(t, "ORG_CONFIRM_PASSWORD", "Confirm Password")}
                required
                value={values.pocConfirmPassword}
                error={fieldErrors.pocConfirmPassword}
                onChange={(value) => updateField("pocConfirmPassword", value)}
              />
            </>
          ) : null}
        </div>
        {!isEditing ? (
          <p className="text-xs text-muted-foreground">
            {orgType === "PLATFORM"
              ? translateOr(
                  t,
                  "ORG_POC_AUTO_CREATE_PLATFORM_NOTE",
                  "The PoC will be created as a user of this organisation with the Organisation POC role.",
                )
              : translateOr(
                  t,
                  "ORG_POC_AUTO_CREATE_VENDOR_NOTE",
                  "The PoC will be created as a user of this organisation with the Vendor POC role.",
                )}
          </p>
        ) : null}
      </section>
    </div>
  );
}
