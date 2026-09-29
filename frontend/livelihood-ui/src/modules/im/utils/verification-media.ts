import type { FileStoreUrlResponse } from "@/shared";
import type { VerificationDocument } from "../types/create-incident";

function getThumbnailUrl(url: string): string {
  if (url.includes(",")) {
    const parts = url.split(",");
    return parts[3] || parts[0] || url;
  }
  return url;
}

/** Full-size original — variant without large/medium/small in path (digit-ui pattern). */
export function getOriginalFileUrl(url: string): string {
  if (!url.includes(",")) {
    return url;
  }
  const parts = url.split(",");
  const original = parts.find(
    (part) =>
      !part.includes("/large/") &&
      !part.includes("/medium/") &&
      !part.includes("/small/"),
  );
  return original ?? parts[0] ?? url;
}

export interface VerificationMedia {
  thumbs: string[];
  images: string[];
  videos: Array<{ master?: string | null; original?: string | null }>;
}

/** Pure — pairs a resolved filestore-url response back up with the
 * documents that were fetched, sorting each into thumbs/images/videos. The
 * caller (a hook) does the actual `fetchFileUrls` call. */
export function mapVerificationMedia(
  documents: VerificationDocument[],
  response: FileStoreUrlResponse,
): VerificationMedia {
  const urlMap = new Map((response.fileStoreIds ?? []).map((entry) => [entry.id, entry.url]));

  const images: string[] = [];
  const videos = new Map<string, { master?: string | null; original?: string | null }>();

  for (const doc of documents) {
    const rawUrl = urlMap.get(doc.fileStoreId);
    if (!rawUrl) {
      continue;
    }

    const fileUrl = getOriginalFileUrl(rawUrl);
    const docType = doc.documentType?.toUpperCase() ?? "";

    if (
      docType === "HLS" ||
      docType.startsWith("VIDEO") ||
      doc.documentType?.toLowerCase().startsWith("video")
    ) {
      const videoKey = doc.documentUid || doc.fileStoreId;
      if (!videos.has(videoKey)) {
        videos.set(videoKey, { master: null, original: null });
      }
      const entry = videos.get(videoKey)!;
      if (docType === "HLS") {
        entry.master = fileUrl;
      } else {
        entry.original = fileUrl;
      }
      continue;
    }

    images.push(fileUrl);
  }

  const thumbs = (response.fileStoreIds ?? []).map((entry) => getThumbnailUrl(entry.url ?? ""));

  return {
    thumbs,
    images,
    videos: Array.from(videos.values()),
  };
}
