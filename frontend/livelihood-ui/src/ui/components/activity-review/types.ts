export type { ActivityStatus } from "@/shared";
import type { ActivityStatus } from "@/shared";

// Shared display model for an activity/installation report's review page —
// used read-only by `eu`'s Activity Report page and with review actions
// layered on top by `ir`'s Activity Review page. Both modules map their own
// raw backend DTOs into these types; this file carries no module-specific
// shape, only what the shared presentational components need to render.

export interface ActivityDocument {
  documentType?: string;
  fileStoreId?: string;
}

export interface LabeledValue {
  labelKey: string;
  label: string;
  value: string;
  /** When set, the value itself is a localization key (falling back to
   * `value` untranslated) — e.g. a boundary code's `BOUNDARY_<code>` name,
   * same convention as `labelKey`/`label`. */
  valueKey?: string;
}

export interface SectionImage {
  url: string;
}

export interface SectionVideo {
  url: string;
  size?: number;
}

/** One physical unit within an asset section — e.g. "Panel 1", "Panel 2". */
export interface AssetItem {
  itemNumber: number;
  /** Overrides the default "{section label} {itemNumber}" heading — used for
   * BOM components that aren't interchangeable units of the same product
   * (e.g. a Machine's distinct parts), where the product name is the heading. */
  label?: string;
  serialNumber?: string;
  capacity?: string;
  quantity?: number;
  images: SectionImage[];
}

/** A labeled media sub-group within a section — used by Machine's Electric
 * Board / Demo Test with Raw Material / Photo with End User fields, which
 * need their own titles rather than sitting in one anonymous gallery. */
export interface MediaGroup {
  id: string;
  labelKey: string;
  label: string;
  images: SectionImage[];
  videos: SectionVideo[];
}

export interface AssetSectionContent {
  kind: "ASSET";
  id: string;
  labelKey: string;
  label: string;
  count?: number;
  specifications: LabeledValue[];
  /** Overrides the default "Specifications" heading — Machine's
   * specifications block covers the installation (vendor/installed-by/
   * report number), not the machine itself, so it reads "Installation
   * Details" instead. */
  specificationsHeading?: { labelKey: string; label: string };
  /** Battery-only, matching qc's one hardcoded special case: an extra titled
   * sub-block (Capacity/Voltage) alongside the regular specifications. */
  extraSpecifications?: { labelKey: string; label: string; fields: LabeledValue[] };
  details?: LabeledValue[];
  items?: AssetItem[];
  images: SectionImage[];
  videos: SectionVideo[];
  mediaGroups?: MediaGroup[];
}

export interface ReportDocument {
  name: string;
  url: string;
  size?: number;
}

export interface ReportSectionContent {
  kind: "REPORT";
  id: string;
  labelKey: string;
  label: string;
  specifications?: LabeledValue[];
  report: ReportDocument | null;
  supportingDocuments: ReportDocument[];
}

/** One installation-image checklist entry (e.g. "Site overview photo"),
 * rendered as its own top-level section — sibling to Panel/Battery/Inverter,
 * not nested inside the report section. */
export interface ImageChecklistSectionContent {
  kind: "IMAGE_CHECKLIST";
  id: string;
  label: string;
  images: SectionImage[];
}

export type ReviewSectionContent =
  | AssetSectionContent
  | ReportSectionContent
  | ImageChecklistSectionContent;

// ---- Lazily-loaded section media ----
// One of these is fetched per section, on expand.

export interface AssetSectionMediaPatch {
  images: SectionImage[];
  videos: SectionVideo[];
  mediaGroups?: Record<string, { images: SectionImage[]; videos: SectionVideo[] }>;
}

export interface ReportSectionMediaPatch {
  report: ReportDocument | null;
  supportingDocuments: ReportDocument[];
}

export interface ImageChecklistMediaPatch {
  images: SectionImage[];
}

export type SectionMediaPatch =
  | AssetSectionMediaPatch
  | ReportSectionMediaPatch
  | ImageChecklistMediaPatch;

// ---- Audit trail ----

export interface AuditSectionReasons {
  sectionId: string;
  sectionLabel: string;
  reasons: { reasonLabel: string; comment: string }[];
}

export interface ActivityAuditCheckpoint {
  id: string;
  status: ActivityStatus;
  date: string;
  actorName?: string;
  comment?: string;
  sectionReasons?: AuditSectionReasons[];
}

// ---- Info card ----

export interface ActivityInfoCardFields {
  district?: { code: string; name?: string };
  block?: { code: string; name?: string };
  componentType: "MACHINE" | "SOLAR";
  status: ActivityStatus;
}
