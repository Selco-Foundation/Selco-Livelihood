import { translateOr } from "../../i18n/translate-or";

// Installation.InstallationTypes is MDMS-driven precisely so a new type
// (e.g. a third asset type) can be added without a frontend deploy — no
// hardcoded code->label map here. The key is built from the code itself, so
// it just needs a matching ES_IR_COMPONENT_TYPE_<CODE> translation staged
// whenever a new type shows up; the raw code is a reasonable fallback until
// then, same as any other translateOr call. Shared by `ir` (reviewer) and
// `eu` (end user) — both display the same activityFacility.componentType
// for the same activity.
export function componentTypeLabel(
  componentType: string | undefined,
  t: (key: string) => string,
): string {
  return componentType ? translateOr(t, `ES_IR_COMPONENT_TYPE_${componentType}`, componentType) : "-";
}
