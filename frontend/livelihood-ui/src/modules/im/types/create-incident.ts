export interface SelectOption {
  code: string;
  name: string;
  key?: string;
  id?: string;
  status?: string;
  parentCode?: string;
}

export interface VerificationDocument {
  fileStoreId: string;
  documentUid: string;
  documentType: string;
  additionalDetails: Record<string, unknown>;
}

export interface UploadedMediaEntry {
  file: File;
  fileStoreId: string;
  masterFileStoreId?: string;
  kind: "image" | "video" | "fir";
}

export interface CreateIncidentFormValues {
  district: SelectOption | null;
  block: SelectOption | null;
  facility: SelectOption | null;
  complaintType: SelectOption | null;
  subType: SelectOption | null;
  systemFunctionality: SelectOption | null;
  comments: string;
}

export interface CreateIncidentResponse {
  IncidentWrappers?: Array<{
    incident?: { incidentId?: string };
    workflow?: { action?: string };
  }>;
  Errors?: Array<{ message?: string }>;
  message?: string;
}
