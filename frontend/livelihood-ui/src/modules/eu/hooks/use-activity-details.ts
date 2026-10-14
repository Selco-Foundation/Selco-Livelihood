import {
  buildAssetSectionMedia,
  buildImageChecklistMedia,
  buildMachineAssetData,
  buildReportSectionMedia,
  buildSolarAssetSections,
  fetchFileUrls,
  fetchInstallationImageCriteriaQuery,
  fetchRejectionReasonOptionsQuery,
  flattenAssetHierarchy,
  installationImageCriteriaQueryKey,
  isResolvableAssetDocument,
  rejectionReasonOptionsQueryKey,
  tenantId,
  useAuthStore,
  type MachineAssetData,
} from "@/shared";
import type { ActivityDocument, AssetSectionContent, ReviewSectionContent, SectionMediaPatch } from "@/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchActivityFacilityById } from "../services/activity-detail";
import { searchAssetsForActivity } from "../services/asset";
import { buildActivityDetail } from "../utils/activity-detail-mapping";
import type { ActivityDetail } from "../types/activity-detail";

export function useActivityDetails(activityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const stateTenantId = tenantId();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["eu-activity-details", activityId],
    enabled: Boolean(accessToken) && Boolean(activityId),
    queryFn: async (): Promise<ActivityDetail | null> => {
      // The installation-image checklist master and the rejection-reason
      // options master are both the same for every activity, so they're
      // fetched through their own shared query keys (queryClient.fetchQuery
      // reuses ir's useInstallationImageCriteria's/useRejectionReasonOptions'
      // cache instead of re-fetching per visit) rather than being
      // activity-scoped like the facility row.
      const [row, installationImageCriteria, rejectionReasonOptions] = await Promise.all([
        fetchActivityFacilityById(activityId, stateTenantId, accessToken!, user),
        queryClient.fetchQuery({
          queryKey: installationImageCriteriaQueryKey(stateTenantId),
          queryFn: fetchInstallationImageCriteriaQuery(stateTenantId, accessToken!, user),
          staleTime: 5 * 60_000,
        }),
        queryClient.fetchQuery({
          queryKey: rejectionReasonOptionsQueryKey(stateTenantId),
          queryFn: fetchRejectionReasonOptionsQuery(stateTenantId, accessToken!, user),
          staleTime: 5 * 60_000,
        }),
      ]);
      if (!row) {
        return null;
      }

      // Both Solar's Panel/Battery/Inverter sections and Machine's PO/
      // invoice/warranty/serial-number details are sourced from the real
      // asset-registry search (mirrors ir's useActivityReview). If the asset
      // search comes back empty (nothing registered yet) or fails, the page
      // still renders — Solar just shows no asset-type sections, and
      // Machine falls back to its BOM-only presentation.
      const isSolar = row.activityFacility?.componentType !== "MACHINE";
      let solarAssetSections: AssetSectionContent[] = [];
      let machineAssetData: MachineAssetData = { details: undefined, items: [], mediaGroups: [] };
      try {
        const rawAssets = await searchAssetsForActivity(activityId, stateTenantId, accessToken!, user);
        const assets = flattenAssetHierarchy(rawAssets);
        const assetImageFileStoreIds = assets
          .flatMap((asset) => asset.documents ?? [])
          .filter((document) => isResolvableAssetDocument(document.documentType))
          .map((document) => document.fileStore)
          .filter((id): id is string => Boolean(id));

        let assetImageUrlById = new Map<string, string>();
        try {
          const assetImageUrls = await fetchFileUrls(assetImageFileStoreIds, stateTenantId, accessToken!, user);
          assetImageUrlById = new Map(
            (assetImageUrls.fileStoreIds ?? [])
              .filter((entry): entry is { id: string; url: string } => Boolean(entry.id && entry.url))
              .map((entry) => [entry.id, entry.url]),
          );
        } catch (error) {
          console.error("Failed to load asset media URLs for activity report:", error);
        }

        if (isSolar) {
          solarAssetSections = buildSolarAssetSections(assets, assetImageUrlById);
        } else {
          machineAssetData = buildMachineAssetData(assets, assetImageUrlById);
        }
      } catch (error) {
        console.error("Failed to load asset details for activity report:", error);
      }

      return buildActivityDetail(
        row,
        installationImageCriteria,
        solarAssetSections,
        rejectionReasonOptions,
        machineAssetData,
      );
    },
  });
}

/**
 * Lazily resolves one section's media on expand, not upfront — mirrors ir's
 * useLoadSectionMedia. Cached per section so re-expanding doesn't re-fetch.
 */
export function useLoadSectionMedia(activityId: string, facilityName: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const stateTenantId = tenantId();
  const queryClient = useQueryClient();

  return (section: ReviewSectionContent, documents: ActivityDocument[]) =>
    queryClient.fetchQuery({
      queryKey: [
        "eu-section-media",
        activityId,
        section.id,
        documents
          .map((document) => document.fileStoreId)
          .filter((id): id is string => Boolean(id))
          .sort((a, b) => a.localeCompare(b)),
      ],
      queryFn: async (): Promise<SectionMediaPatch> => {
        const fileStoreIds = documents
          .map((document) => document.fileStoreId)
          .filter((id): id is string => Boolean(id));
        const response = await fetchFileUrls(fileStoreIds, stateTenantId, accessToken!, user);

        if (section.kind === "REPORT") {
          return buildReportSectionMedia(documents, response, facilityName);
        }
        if (section.kind === "IMAGE_CHECKLIST") {
          return buildImageChecklistMedia(documents, response);
        }
        return buildAssetSectionMedia(documents, response);
      },
      staleTime: Infinity,
    });
}
