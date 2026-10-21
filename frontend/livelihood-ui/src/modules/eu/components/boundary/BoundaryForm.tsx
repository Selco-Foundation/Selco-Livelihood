import { translateOr, useTranslate } from "@/shared";
import { Input, Skeleton } from "@/ui";
import { ArrowLeftRight } from "lucide-react";
import { boundaryDisplayName } from "../../utils/boundary";
import { LGD_CODE_MAX_LENGTH, useBoundaryForm } from "../../hooks/use-boundary-form";
import { LGD_BLOCK_TIERS, type LgdBlockTier } from "../../types/boundary";
import { FormSelectField, type SelectOption } from "../facility/FormSelectField";

interface ToggleButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}

function ToggleButton({ onClick, disabled, label }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="mt-6 flex size-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors enabled:hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      <ArrowLeftRight className="size-4" />
    </button>
  );
}

interface LgdCodeFieldProps {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

function LgdCodeField({ label, value, error, onChange }: LgdCodeFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        <span className="text-destructive"> *</span>
      </label>
      <Input
        value={value}
        inputMode="numeric"
        maxLength={LGD_CODE_MAX_LENGTH}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

interface BoundaryFormProps {
  form: ReturnType<typeof useBoundaryForm>;
}

/** Presentational half of the boundary create form — state lives in `useBoundaryForm`. */
export function BoundaryForm({ form }: BoundaryFormProps) {
  const { t } = useTranslate();
  const {
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
  } = form;

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const stateOptions: SelectOption[] = states.map((state) => ({
    code: state.code,
    name: boundaryDisplayName(state.code, t),
  }));
  const districtOptions: SelectOption[] = districts.map((district) => ({
    code: district.code,
    name: boundaryDisplayName(district.code, t),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          {isStateTextMode ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {translateOr(t, "CS_STATE", "State")}
                <span className="text-destructive"> *</span>
              </label>
              <Input value={values.state} onChange={(event) => updateState(event.target.value)} />
            </div>
          ) : (
            <FormSelectField
              label={translateOr(t, "CS_STATE", "State")}
              required
              value={values.state}
              options={stateOptions}
              onChange={(option) => updateState(option?.code ?? "")}
            />
          )}
        </div>
        <ToggleButton
          onClick={toggleStateMode}
          label={translateOr(t, "FA_TOGGLE_STATE_MODE", "Switch between picking or typing a state")}
        />
      </div>
      {fieldErrors.state ? <p className="text-xs text-destructive">{fieldErrors.state}</p> : null}

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          {isStateTextMode || isDistrictTextMode ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {translateOr(t, "CS_DISTRICT", "District")}
                <span className="text-destructive"> *</span>
              </label>
              <Input value={values.district} onChange={(event) => updateDistrict(event.target.value)} />
            </div>
          ) : (
            <FormSelectField
              label={translateOr(t, "CS_DISTRICT", "District")}
              required
              value={values.district}
              options={districtOptions}
              disabled={!values.state}
              onChange={(option) => updateDistrict(option?.code ?? "")}
            />
          )}
        </div>
        <ToggleButton
          onClick={toggleDistrictMode}
          disabled={isStateTextMode}
          label={translateOr(t, "FA_TOGGLE_DISTRICT_MODE", "Switch between picking or typing a district")}
        />
      </div>
      {fieldErrors.district ? <p className="text-xs text-destructive">{fieldErrors.district}</p> : null}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {translateOr(t, "CS_BLOCK", "Block")}
          <span className="text-destructive"> *</span>
        </label>
        <Input value={values.block} onChange={(event) => updateBlock(event.target.value)} />
        {fieldErrors.block ? <p className="text-xs text-destructive">{fieldErrors.block}</p> : null}
      </div>

      {/* LGD codes, required for every tier created here. A state or district picked from the
          list keeps the codes it already has, and the new tiers under it inherit them. */}
      <div className="space-y-3 rounded-md border border-border p-3">
        <p className="text-sm font-semibold text-foreground">
          {translateOr(t, "EU_LGD_CODES", "LGD Codes")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {isStateTextMode ? (
            <LgdCodeField
              label={translateOr(t, "EU_LGD_STATE_CODE", "LGD State Code")}
              value={values.lgdStateCode}
              error={fieldErrors.lgdStateCode}
              onChange={(value) => updateLgdCode("lgdStateCode", value)}
            />
          ) : null}
          {isStateTextMode || isDistrictTextMode ? (
            <LgdCodeField
              label={translateOr(t, "EU_LGD_DISTRICT_CODE", "LGD District Code")}
              value={values.lgdDistrictCode}
              error={fieldErrors.lgdDistrictCode}
              onChange={(value) => updateLgdCode("lgdDistrictCode", value)}
            />
          ) : null}
          <LgdCodeField
            label={translateOr(t, "EU_LGD_BLOCK_CODE", "LGD Block Code")}
            value={values.lgdBlockCode}
            error={fieldErrors.lgdBlockCode}
            onChange={(value) => updateLgdCode("lgdBlockCode", value)}
          />
          <FormSelectField
            label={translateOr(t, "EU_LGD_BLOCK_TIER", "LGD Block Tier")}
            required
            value={values.lgdBlockTier}
            options={LGD_BLOCK_TIERS.map((tier) => ({
              code: tier,
              name: translateOr(t, `EU_LGD_TIER_${tier.toUpperCase().replace("-", "_")}`, tier),
            }))}
            onChange={(option) => updateLgdBlockTier((option?.code as LgdBlockTier | undefined) ?? "Block")}
          />
        </div>
      </div>
    </div>
  );
}
