import { apiClient } from "./client";
import type { AuthUser } from "../stores/auth-store";

export interface FileStoreUrlEntry {
  id?: string;
  url?: string;
}

export interface FileStoreUrlResponse {
  fileStoreIds?: FileStoreUrlEntry[];
}

/**
 * egov-filestore concatenates thumbnail variants onto the same `url` string
 * for any image file — `original,large,medium,small`, each a full presigned
 * URL with its own query string, joined by a bare comma (backend
 * `MinioRepository.setThumnailSignedURL`). Left as-is, that breaks every
 * consumer: a browser only recognizes the first `?` as starting a query
 * string, so everything after the first URL gets absorbed into its last
 * query param's value, corrupting the signature. Keep just the first
 * (original, full-size) URL — non-image files never get this treatment, so
 * this is a no-op for them.
 */
function firstUrl(url: string | undefined): string | undefined {
  return url?.split(",")[0];
}

export async function fetchFileUrls(
  fileStoreIds: string[],
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<FileStoreUrlResponse> {
  void accessToken;
  void user;

  if (!fileStoreIds.length) {
    return { fileStoreIds: [] };
  }

  const { data } = await apiClient.get<FileStoreUrlResponse>("/filestore/v1/files/url", {
    params: {
      tenantId,
      fileStoreIds: fileStoreIds.join(","),
    },
  });

  return {
    ...data,
    fileStoreIds: (data.fileStoreIds ?? []).map((entry) => ({ ...entry, url: firstUrl(entry.url) })),
  };
}
