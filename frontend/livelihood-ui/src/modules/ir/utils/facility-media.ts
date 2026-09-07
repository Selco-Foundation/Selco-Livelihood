import { classifyDocument, REPORT_DOCUMENT_TYPES } from "./facility-documents";
import type {
  ActivityDocument,
  AssetSectionMediaPatch,
  ImageChecklistMediaPatch,
  ReportDocument,
  ReportSectionMediaPatch,
  SectionImage,
  SectionVideo,
} from "../types/facility-review";
import type { FileStoreUrlResponse } from "@/shared";

function buildUrlMap(response: FileStoreUrlResponse): Map<string, string> {
  return new Map(
    (response.fileStoreIds ?? [])
      .filter((entry): entry is { id: string; url: string } => Boolean(entry.id && entry.url))
      .map((entry) => [entry.id, entry.url]),
  );
}

function resolveUrl(document: ActivityDocument, urlMap: Map<string, string>): string | undefined {
  return document.fileStoreId ? urlMap.get(document.fileStoreId) : undefined;
}

/** Section-level (not per-group) images/videos for a set of already
 * section-scoped documents — matches qc's flat per-assetType gallery
 * (`documentAggregation.images[assetType]`); there's no per-BOM-item media. */
export function buildAssetSectionMedia(
  documents: ActivityDocument[],
  response: FileStoreUrlResponse,
  mediaGroupIds?: string[],
): AssetSectionMediaPatch {
  const urlMap = buildUrlMap(response);
  const images: SectionImage[] = [];
  const videos: SectionVideo[] = [];
  const mediaGroups: Record<string, { images: SectionImage[]; videos: SectionVideo[] }> = {};

  if (mediaGroupIds) {
    for (const groupId of mediaGroupIds) {
      mediaGroups[groupId] = { images: [], videos: [] };
    }
  }

  for (const document of documents) {
    const classified = classifyDocument(document);
    const url = resolveUrl(document, urlMap);
    if (!url || classified.kind === "OTHER") {
      continue;
    }

    const group = classified.suffix ? mediaGroups[classified.suffix] : undefined;
    if (classified.kind === "IMAGE") {
      (group?.images ?? images).push({ url });
    } else {
      (group?.videos ?? videos).push({ url, size: undefined });
    }
  }

  return { images, videos, mediaGroups: mediaGroupIds ? mediaGroups : undefined };
}

export function buildReportSectionMedia(
  documents: ActivityDocument[],
  response: FileStoreUrlResponse,
  facilityName: string,
): ReportSectionMediaPatch {
  const urlMap = buildUrlMap(response);

  function findDocument(type: string): ReportDocument | null {
    const match = documents.find((document) => document.documentType?.toUpperCase() === type);
    const url = match ? resolveUrl(match, urlMap) : undefined;
    return url ? { name: `${facilityName}.pdf`, url } : null;
  }

  const supportingDocuments: ReportDocument[] = documents
    .filter((document) => document.documentType?.toUpperCase() === "INSTALLATION_REPORT")
    .map((document) => resolveUrl(document, urlMap))
    .filter((url): url is string => Boolean(url))
    .map((url) => ({ name: `${facilityName}.pdf`, url }));

  return {
    installationCompletionCertificate: findDocument(REPORT_DOCUMENT_TYPES[2]),
    assetHandoverDocument: findDocument(REPORT_DOCUMENT_TYPES[3]),
    supportingDocuments,
  };
}

export function buildImageChecklistMedia(
  documents: ActivityDocument[],
  response: FileStoreUrlResponse,
): ImageChecklistMediaPatch {
  const urlMap = buildUrlMap(response);
  const images: SectionImage[] = [];

  for (const document of documents) {
    const url = resolveUrl(document, urlMap);
    if (url) {
      images.push({ url });
    }
  }

  return { images };
}
