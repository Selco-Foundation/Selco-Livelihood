import { fetchFileUrls, tenantId, useAuthStore } from "@/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchActivityFacilityById } from "../services/activity-detail";
import { searchAssetsForActivity } from "../services/asset";
import {
  buildActivityInfo,
  buildAssetSections,
  buildAuditTrail,
  buildReportSection,
  resolveAssetItemImages,
  resolveReportSection,
} from "../utils/activity-detail-mapping";
import { useAssetTypeOptions } from "./use-asset-type-options";
import type { ActivityDetail, AssetItem, ResolvedReportSection } from "../types/activity-detail";

export function useActivityDetails(activityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const { assetTypes, isLoading: isAssetTypesLoading } = useAssetTypeOptions();

  return useQuery({
    queryKey: ["eu-activity-details", activityId],
    // Waiting on assetTypes to finish loading (rather than adding it to the queryKey) avoids
    // caching asset-section labels built while the MDMS options were still an empty array — the
    // query would never refetch once assetTypes actually arrived.
    enabled: Boolean(accessToken) && Boolean(activityId) && !isAssetTypesLoading,
    queryFn: async (): Promise<ActivityDetail | undefined> => {
      const stateTenantId = tenantId();
      const row = await fetchActivityFacilityById(activityId, stateTenantId, accessToken!, user);
      if (!row) {
        return undefined;
      }

      const assets = await searchAssetsForActivity(activityId, stateTenantId, accessToken!, user).catch(
        () => [],
      );
      const assetTypeNames = new Map(assetTypes.map((option) => [option.code, option.name]));
      const latestWorkflow = row.workflow?.[0];

      return {
        info: buildActivityInfo(row),
        auditTrail: buildAuditTrail(row.workflow),
        assetSections: buildAssetSections(assets, assetTypeNames),
        reportSection: buildReportSection(latestWorkflow?.documents ?? undefined),
      };
    },
  });
}

/**
 * Resolves one asset section's item photos on expand, not upfront — cached
 * per section so re-expanding doesn't re-fetch, matching the same
 * lazy-per-section pattern used by the installation review page for the same
 * reason: a report can carry a lot of attachments.
 */
export function useLoadAssetSectionImages(activityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return (sectionId: string, items: AssetItem[], photoDocuments: { fileStoreId: string }[][]) =>
    queryClient.fetchQuery({
      queryKey: [
        "eu-activity-section-images",
        activityId,
        sectionId,
        photoDocuments
          .flat()
          .map((ref) => ref.fileStoreId)
          .sort((a, b) => a.localeCompare(b)),
      ],
      queryFn: async (): Promise<AssetItem[]> => {
        const fileStoreIds = photoDocuments.flat().map((ref) => ref.fileStoreId);
        const response = await fetchFileUrls(fileStoreIds, tenantId(), accessToken!, user);
        const urlByFileStoreId = new Map(
          (response.fileStoreIds ?? [])
            .filter((entry): entry is { id: string; url: string } => Boolean(entry.id && entry.url))
            .map((entry) => [entry.id, entry.url]),
        );
        return resolveAssetItemImages(items, photoDocuments, urlByFileStoreId);
      },
      staleTime: Infinity,
    });
}

export function useLoadReportSection(activityId: string, facilityName: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return (documents: { fileStoreId: string; documentType?: string }[]) =>
    queryClient.fetchQuery({
      queryKey: [
        "eu-activity-report-section",
        activityId,
        documents.map((document) => document.fileStoreId).sort((a, b) => a.localeCompare(b)),
      ],
      queryFn: async (): Promise<ResolvedReportSection> => {
        const fileStoreIds = documents.map((document) => document.fileStoreId);
        const response = await fetchFileUrls(fileStoreIds, tenantId(), accessToken!, user);
        const urlByFileStoreId = new Map(
          (response.fileStoreIds ?? [])
            .filter((entry): entry is { id: string; url: string } => Boolean(entry.id && entry.url))
            .map((entry) => [entry.id, entry.url]),
        );
        return resolveReportSection({ documents }, urlByFileStoreId, facilityName);
      },
      staleTime: Infinity,
    });
}
