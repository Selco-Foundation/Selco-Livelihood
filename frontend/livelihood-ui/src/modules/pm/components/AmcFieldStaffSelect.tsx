import { translateOr, useTranslate } from "@/shared";
import { SearchableSelect } from "@/ui";
import { useAmcFieldStaffOptions } from "../hooks/use-amc-field-staff-options";

/** The AMC field staff of one vendor organisation; disabled until an organisation is known. */
export function AmcFieldStaffSelect({
  organizationId,
  value,
  onChange,
  disabled,
  rowLabel,
}: Readonly<{
  organizationId: string | undefined;
  value: string;
  onChange: (code: string, name?: string) => void;
  disabled: boolean;
  rowLabel: string;
}>) {
  const { t } = useTranslate();
  const { data: staff = [] } = useAmcFieldStaffOptions(organizationId);

  return (
    <SearchableSelect
      ariaLabel={`${translateOr(t, "ES_PM_AMC_FIELD_STAFF", "AMC field staff")}, ${rowLabel}`}
      value={value}
      options={staff}
      placeholder={translateOr(t, "ES_PM_SELECT_AMC_FIELD_STAFF", "Select AMC field staff")}
      onChange={(option) => onChange(option?.code ?? "", option?.name)}
      disabled={disabled || !organizationId}
      error={
        organizationId && staff.length === 0
          ? translateOr(t, "ES_PM_AMC_FIELD_STAFF_NONE", "No AMC field staff in this organization")
          : undefined
      }
      errorAsTooltip
    />
  );
}
