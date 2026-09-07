import { apiClient } from "./client";
import type { AuthUser } from "../stores/auth-store";

export interface FileStoreUrlEntry {
  id?: string;
  url?: string;
}

export interface FileStoreUrlResponse {
  fileStoreIds?: FileStoreUrlEntry[];
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

  return data;
}
