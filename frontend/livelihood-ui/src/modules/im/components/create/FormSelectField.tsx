import type { SelectOption } from "../../types/create-incident";
import { translateOr, useTranslate } from "@/shared";
import { Select } from "@/ui";

interface FormSelectFieldProps {
  label: string;
  required?: boolean;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onChange: (option: SelectOption | null) => void;
}

/** Thin IM-local wrapper over the shared `Select` combobox, kept so existing
 *  call sites (typed against `SelectOption`, with IM's localized copy) don't
 *  need to change. */
export function FormSelectField(props: FormSelectFieldProps) {
  const { t } = useTranslate();
  return (
    <Select
      {...props}
      placeholder={props.placeholder ?? translateOr(t, "ES_COMMON_SELECT_PLACEHOLDER", "Select")}
      searchPlaceholder={translateOr(t, "ES_COMMON_SEARCH", "Search")}
      noOptionsLabel={translateOr(t, "ES_COMMON_NO_OPTIONS", "No options found")}
    />
  );
}
