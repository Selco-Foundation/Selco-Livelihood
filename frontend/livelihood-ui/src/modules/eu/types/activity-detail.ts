export interface ActivityInfo {
  facilityName?: string;
  activityType?: string;
  projectCode?: string;
  fieldPlanCode?: string;
}

export interface AuditCheckpoint {
  id: string;
  status: string;
  date: string;
  actorName?: string;
  comment?: string;
}

export interface LabeledValue {
  label: string;
  value: string;
}

export interface SectionImage {
  url: string;
}

export interface AssetItem {
  itemNumber: number;
  serialNumber: string;
  capacity: string;
  images: SectionImage[];
}

/** Raw document reference before its URL is resolved — resolution happens lazily, only once a section is expanded. */
export interface RawDocumentRef {
  fileStoreId: string;
  documentType?: string;
}

export interface AssetSection {
  id: string;
  label: string;
  count: number;
  specifications: LabeledValue[];
  details: LabeledValue[];
  items: AssetItem[];
  /** Every item's photo documents, keyed by item index — resolved into `items[].images` on expand. */
  photoDocuments: RawDocumentRef[][];
}

export interface ReportDocument {
  name: string;
  url: string;
}

export interface ReportSection {
  documents: RawDocumentRef[];
}

export interface ResolvedReportSection {
  installationCompletionCertificate: ReportDocument | null;
  assetHandoverDocument: ReportDocument | null;
  supportingDocuments: ReportDocument[];
}

export interface ActivityDetail {
  info: ActivityInfo;
  auditTrail: AuditCheckpoint[];
  assetSections: AssetSection[];
  reportSection: ReportSection;
}
