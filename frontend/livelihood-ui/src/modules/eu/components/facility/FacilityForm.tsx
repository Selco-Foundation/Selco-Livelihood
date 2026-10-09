import { translateOr, useTranslate } from "@/shared";
import { Input, Skeleton } from "@/ui";
import { boundaryDisplayName } from "../../utils/boundary";
import { useFacilityForm } from "../../hooks/use-facility-form";
import { FormSelectField, type SelectOption } from "./FormSelectField";

const YES_NO_OPTIONS: SelectOption[] = [
  { code: "YES", name: "Yes" },
  { code: "NO", name: "No" },
];

interface FacilityFormProps {
  form: ReturnType<typeof useFacilityForm>;
}

/** Presentational half of the facility create/edit form — state lives in `useFacilityForm`. */
export function FacilityForm({ form }: FacilityFormProps) {
  const { t } = useTranslate();
  const {
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
  } = form;

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const stateOptions: SelectOption[] = states.map((state) => ({
    code: state.code,
    name: boundaryDisplayName(state.code, t),
  }));
  const districtOptions: SelectOption[] = districts.map((district) => ({
    code: district.code,
    name: boundaryDisplayName(district.code, t),
  }));
  const blockOptions: SelectOption[] = blocks.map((block) => ({
    code: block.code,
    name: boundaryDisplayName(block.code, t),
  }));
  const categoryOptions: SelectOption[] = facilityCategories.map((category) => ({
    code: category.code,
    name: category.name,
  }));
  const typeOptions: SelectOption[] = facilityTypeOptions.map((type) => ({
    code: type.code,
    name: type.name,
  }));
  const endUserTypeOptions: SelectOption[] = endUserTypes.map((option) => ({
    code: option.code,
    name: option.name,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <FormSelectField
          label={translateOr(t, "CS_STATE", "State")}
          required
          value={values.state}
          options={stateOptions}
          disabled={isEditing}
          error={fieldErrors.state}
          onChange={(option) => updateField("state", option?.code ?? "")}
        />
        <FormSelectField
          label={translateOr(t, "CS_DISTRICT", "District")}
          required
          value={values.district}
          options={districtOptions}
          disabled={isEditing || !values.state}
          error={fieldErrors.district}
          onChange={(option) => updateField("district", option?.code ?? "")}
        />
        <FormSelectField
          label={translateOr(t, "CS_BLOCK", "Block")}
          required
          value={values.block}
          options={blockOptions}
          disabled={isEditing || !values.district}
          error={fieldErrors.block}
          onChange={(option) => updateField("block", option?.code ?? "")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {translateOr(t, "END_USER_SITE_NAME", "End User Site Name")}
            <span className="text-destructive"> *</span>
          </label>
          <Input
            value={values.facilityName}
            onChange={(event) => updateField("facilityName", event.target.value)}
          />
          {fieldErrors.facilityName ? (
            <p className="text-xs text-destructive">{fieldErrors.facilityName}</p>
          ) : null}
        </div>

        <FormSelectField
          label={translateOr(t, "END_USER_SITE_CATEGORY", "End User Site Category")}
          required
          value={values.facilityCategory}
          options={categoryOptions}
          disabled={isEditing}
          error={fieldErrors.facilityCategory}
          onChange={(option) => updateField("facilityCategory", option?.code ?? "")}
        />

        <FormSelectField
          label={translateOr(t, "FACILITY_TYPE", "Sector")}
          required
          value={values.facilityType}
          options={typeOptions}
          disabled={!values.facilityCategory}
          error={fieldErrors.facilityType}
          onChange={(option) => updateField("facilityType", option?.code ?? "")}
        />

        <FormSelectField
          label={translateOr(t, "FACILITY_END_USER_TYPE", "End User Type")}
          value={values.endUserType}
          options={endUserTypeOptions}
          onChange={(option) => updateField("endUserType", option?.code ?? "")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {translateOr(t, "FACILITY_POC_NAME", "POC Name")}
            <span className="text-destructive"> *</span>
          </label>
          <Input value={values.pocName} onChange={(event) => updateField("pocName", event.target.value)} />
          {fieldErrors.pocName ? <p className="text-xs text-destructive">{fieldErrors.pocName}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {translateOr(t, "FACILITY_POC_USERNAME", "POC Username")}
            <span className="text-destructive"> *</span>
          </label>
          <Input
            value={values.pocUsername}
            disabled={isEditing}
            onChange={(event) => updateField("pocUsername", event.target.value)}
          />
          {fieldErrors.pocUsername ? (
            <p className="text-xs text-destructive">{fieldErrors.pocUsername}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {translateOr(t, "FACILITY_POC_PHONE", "POC Phone")}
            <span className="text-destructive"> *</span>
          </label>
          <Input
            value={values.pocPhone}
            maxLength={10}
            onChange={(event) => updateField("pocPhone", event.target.value)}
          />
          {fieldErrors.pocPhone ? <p className="text-xs text-destructive">{fieldErrors.pocPhone}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {translateOr(t, "FACILITY_POC_EMAIL", "POC Email")}
          </label>
          <Input value={values.pocEmail} onChange={(event) => updateField("pocEmail", event.target.value)} />
          {fieldErrors.pocEmail ? <p className="text-xs text-destructive">{fieldErrors.pocEmail}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormSelectField
          label={translateOr(t, "FACILITY_IS_OPERATIONAL", "Operational")}
          value={values.isOperational ? "YES" : "NO"}
          options={YES_NO_OPTIONS}
          disabled={!isEditing}
          onChange={(option) => updateField("isOperational", (option?.code ?? "YES") === "YES")}
        />
        <FormSelectField
          label={translateOr(t, "FACILITY_IS_ONM_READY", "ONM Ready")}
          value={values.isOnmReady ? "YES" : "NO"}
          options={YES_NO_OPTIONS}
          disabled={!values.isOperational}
          onChange={(option) => updateField("isOnmReady", (option?.code ?? "YES") === "YES")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {translateOr(t, "FACILITY_LATITUDE", "Latitude")}
          </label>
          <Input value={values.latitude} onChange={(event) => updateField("latitude", event.target.value)} />
          {fieldErrors.latitude ? <p className="text-xs text-destructive">{fieldErrors.latitude}</p> : null}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {translateOr(t, "FACILITY_LONGITUDE", "Longitude")}
          </label>
          <Input value={values.longitude} onChange={(event) => updateField("longitude", event.target.value)} />
          {fieldErrors.longitude ? <p className="text-xs text-destructive">{fieldErrors.longitude}</p> : null}
        </div>
      </div>
    </div>
  );
}
