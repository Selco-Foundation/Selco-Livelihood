import { fetchFileUrls, useAuthStore } from "@/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MACHINE_MEDIA_GROUPS } from "../constants/review";
import { REJECTION_REASON_OPTIONS } from "../constants/rejection-reasons";
import {
  fetchInstallationImageCriteriaQuery,
  installationImageCriteriaQueryKey,
} from "./use-installation-image-criteria";
import { searchAssetsForActivityFacility } from "../services/asset";
import { searchActivityFacilities } from "../services/facility";
import { submitFacilityReview } from "../services/review";
import { ASSET_PHOTO_DOCUMENT_TYPE_PREFIX, buildSolarAssetSections } from "../utils/asset-mapping";
import {
  buildAssetSectionMedia,
  buildImageChecklistMedia,
  buildReportSectionMedia,
} from "../utils/facility-media";
import { buildFacilityReviewDetail } from "../utils/facility-review-mapping";
import type {
  ActivityDocument,
  AssetSectionContent,
  FacilityReviewDetail,
  ReviewSectionContent,
  SectionMediaPatch,
  SubmitFacilityReviewInput,
} from "../types/facility-review";

export function useRejectionReasonOptions() {
  return REJECTION_REASON_OPTIONS;
}

export function useFacilityReview(entryId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["ir-facility-review", employeeTenantId, entryId],
    enabled: Boolean(accessToken && employeeTenantId && entryId),
    queryFn: async (): Promise<FacilityReviewDetail | null> => {
      // The installation-image checklist master is the same for every entry,
      // so it's fetched through the shared query key (queryClient.fetchQuery
      // reuses useInstallationImageCriteria's cache instead of re-fetching it
      // per review) rather than being entry-scoped like the facility row.
      const [data, installationImageCriteria] = await Promise.all([
        searchActivityFacilities(
          { tenantId: employeeTenantId!, ids: [entryId] },
          { limit: 1, offset: 0 },
          accessToken!,
          user,
        ),
        queryClient.fetchQuery({
          queryKey: installationImageCriteriaQueryKey(employeeTenantId!),
          queryFn: fetchInstallationImageCriteriaQuery(employeeTenantId!, accessToken!, user),
          staleTime: 5 * 60_000,
        }),
      ]);
      const row = data.facility?.[0];
      if (!row) {
        return null;
      }

      // Solar's Panel/Battery/Inverter sections are sourced from the real
      // asset-registry search (matches qc's useAsset.js), not the BOM — a
      // Machine entry has no equivalent, so it stays an empty array. If the
      // asset search comes back empty (or fails) the page still renders,
      // just without those sections — same as qc when its own asset query
      // returns nothing.
      const isSolar = row.activityFacility.componentType !== "MACHINE";
      let solarAssetSections: AssetSectionContent[] = [];
      if (isSolar) {
        try {
          const assets = await searchAssetsForActivityFacility(
            entryId,
            employeeTenantId!,
            accessToken!,
            user,
          );
          const assetImageFileStoreIds = assets
            .flatMap((asset) => asset.documents ?? [])
            .filter((document) =>
              document.documentType?.toUpperCase().startsWith(ASSET_PHOTO_DOCUMENT_TYPE_PREFIX),
            )
            .map((document) => document.fileStore)
            .filter((id): id is string => Boolean(id));
          const assetImageUrls = await fetchFileUrls(
            assetImageFileStoreIds,
            employeeTenantId!,
            accessToken!,
            user,
          );
          const assetImageUrlById = new Map(
            (assetImageUrls.fileStoreIds ?? [])
              .filter((entry): entry is { id: string; url: string } => Boolean(entry.id && entry.url))
              .map((entry) => [entry.id, entry.url]),
          );
          solarAssetSections = buildSolarAssetSections(assets, assetImageUrlById);
        } catch (error) {
          console.error("Failed to load asset details for facility review:", error);
        }
      }

      return buildFacilityReviewDetail(row, installationImageCriteria, solarAssetSections);
    },
  });
}

/**
 * Lazily resolves one section's media on expand, not upfront — an
 * installation report can carry a lot of attachments, so loading every
 * section's documents on page open would slow the page down. Cached per
 * section so re-expanding doesn't re-fetch.
 */
export function useLoadSectionMedia(entryId: string, facilityName: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const queryClient = useQueryClient();

  return (section: ReviewSectionContent, documents: ActivityDocument[]) =>
    queryClient.fetchQuery({
      queryKey: ["ir-section-media", employeeTenantId, entryId, section.id],
      queryFn: async (): Promise<SectionMediaPatch> => {
        const fileStoreIds = documents
          .map((document) => document.fileStoreId)
          .filter((id): id is string => Boolean(id));
        const response = await fetchFileUrls(fileStoreIds, employeeTenantId!, accessToken!, user);

        if (section.kind === "REPORT") {
          return buildReportSectionMedia(documents, response, facilityName);
        }
        if (section.kind === "IMAGE_CHECKLIST") {
          return buildImageChecklistMedia(documents, response);
        }
        return buildAssetSectionMedia(
          documents,
          response,
          section.id === "MACHINE" ? MACHINE_MEDIA_GROUPS.map((group) => group.id) : undefined,
        );
      },
      staleTime: Infinity,
    });
}

export function useSubmitFacilityReview(entryId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitFacilityReviewInput) =>
      submitFacilityReview(input, employeeTenantId!, accessToken!, user),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ir-facility-review", employeeTenantId, entryId],
      });
    },
  });
}
