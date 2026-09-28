import { apiClient } from "./client";
import { createRequestInfo } from "./request-info";
import type { AuthUser } from "../stores/auth-store";

export interface LocalizationMessage {
  code: string;
  message: string;
  module?: string;
  locale?: string;
}

export interface LocalizationResponse {
  messages: LocalizationMessage[];
}

export interface FetchLocalizationParams {
  locale: string;
  tenantId: string;
  modules: string[];
}

const LOCALIZATION_URL = "/localization/messages/v1/_search";

function messagesToResourceMap(messages: LocalizationMessage[]): Record<string, string> {
  return messages.reduce<Record<string, string>>((acc, item) => {
    acc[item.code] = item.message;
    return acc;
  }, {});
}

export async function fetchLocalization({
  locale,
  tenantId,
  modules,
}: FetchLocalizationParams): Promise<Record<string, string>> {
  if (modules.length === 0) {
    return {};
  }

  const { data } = await apiClient.post<LocalizationResponse>(
    LOCALIZATION_URL,
    {
      RequestInfo: {
        apiId: "Rainmaker",
        msgId: `${Date.now()}|${locale}`,
      },
    },
    {
      params: {
        module: modules.join(","),
        locale,
        tenantId,
        _: Date.now(),
      },
    },
  );

  return messagesToResourceMap(data.messages ?? []);
}

export { messagesToResourceMap };

/**
 * Registers a display name for a code (e.g. a newly created boundary's
 * `Boundary_<code>` key). Callers must `reloadModule(...)` (see `@/shared`'s
 * i18n) afterwards to bust the cached bundle so the new name renders
 * immediately instead of waiting for the next natural refetch.
 */
export async function upsertLocalization(
  payload: { tenantId: string; messages: LocalizationMessage[] },
  accessToken: string,
  user?: AuthUser | null,
): Promise<void> {
  await apiClient.post("/localization/messages/v1/_upsert", {
    RequestInfo: createRequestInfo(accessToken, user),
    ...payload,
  });
}
