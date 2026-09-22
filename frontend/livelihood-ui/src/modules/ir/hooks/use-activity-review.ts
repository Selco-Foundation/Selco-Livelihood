import { fetchFileUrls, useAuthStore } from "@/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchInstallationImageCriteriaQuery,
  installationImageCriteriaQueryKey,
} from "./use-installation-image-criteria";
import {
  fetchRejectionReasonOptionsQuery,
  rejectionReasonOptionsQueryKey,
} from "./use-rejection-reason-options";
import { searchAssetsForActivityFacility } from "../services/asset";
import { ACTIVITY_CODE_INSTALLATION, searchActivityFacilities } from "../services/facility";
import { submitFacilityReview } from "../services/review";
import {
  buildMachineAssetData,
  buildSolarAssetSections,
  isResolvableAssetDocument,
  type MachineAssetData,
} from "../utils/asset-mapping";
import {
  buildAssetSectionMedia,
  buildImageChecklistMedia,
  buildReportSectionMedia,
} from "../utils/facility-media";
import { buildActivityReviewDetail } from "../utils/activity-review-mapping";
import { hasIrAccess } from "../utils/access";
import type {
  ActivityDocument,
  ActivityReviewDetail,
  AssetSectionContent,
  ReviewSectionContent,
  SectionMediaPatch,
  SubmitActivityReviewInput,
} from "../types/activity-review";

export function useActivityReview(activityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["ir-activity-review", employeeTenantId, activityId],
    enabled: Boolean(accessToken && employeeTenantId && activityId && hasIrAccess(user?.roles)),
    queryFn: async (): Promise<ActivityReviewDetail | null> => {
      // The installation-image checklist master and the rejection-reason
      // options master are both the same for every activity, so they're
      // fetched through their own shared query keys (queryClient.fetchQuery
      // reuses useInstallationImageCriteria's/useRejectionReasonOptions'
      // cache instead of re-fetching per review) rather than being
      // activity-scoped like the facility row.
      const [data, installationImageCriteria, rejectionReasonOptions] = await Promise.all([
        searchActivityFacilities(
          {
            tenantId: employeeTenantId!,
            ids: [activityId],
            activityCodes: [ACTIVITY_CODE_INSTALLATION],
          },
          { limit: 1, offset: 0 },
          accessToken!,
          user,
        ),
        queryClient.fetchQuery({
          queryKey: installationImageCriteriaQueryKey(employeeTenantId!),
          queryFn: fetchInstallationImageCriteriaQuery(employeeTenantId!, accessToken!, user),
          staleTime: 5 * 60_000,
        }),
        queryClient.fetchQuery({
          queryKey: rejectionReasonOptionsQueryKey(employeeTenantId!),
          queryFn: fetchRejectionReasonOptionsQuery(employeeTenantId!, accessToken!, user),
          staleTime: 5 * 60_000,
        }),
      ]);
      const row = data.facility?.[0];
      if (!row) {
        return null;
      }

      // Both Solar's Panel/Battery/Inverter sections and Machine's PO/
      // invoice/warranty/serial-number details are sourced from the real
      // asset-registry search (matches qc's useAsset.js for Solar) rather
      // than the BOM. If the asset search comes back empty (nothing
      // registered yet) or fails, the page still renders — Solar just
      // shows no asset-type sections, and Machine falls back to its BOM-
      // only presentation, same as qc when its own asset query returns
      // nothing.
      const isSolar = row.activityFacility.componentType !== "MACHINE";
      let solarAssetSections: AssetSectionContent[] = [];
      let machineAssetData: MachineAssetData = { details: undefined, items: [], mediaGroups: [] };
      try {
        const assets = await searchAssetsForActivityFacility(
          activityId,
          employeeTenantId!,
          accessToken!,
          user,
        );
        const assetImageFileStoreIds = assets
          .flatMap((asset) => asset.documents ?? [])
          .filter((document) => isResolvableAssetDocument(document.documentType))
          .map((document) => document.fileStore)
          .filter((id): id is string => Boolean(id));

        // Resolved separately from the asset search itself: if this fails
        // (media URLs didn't resolve), the asset's own text fields — serial
        // number, PO number, warranty, etc. — don't depend on it and
        // shouldn't be thrown away too. An empty map just means every
        // image/video for this asset comes up unresolved, same as if the
        // asset simply had no documents.
        let assetImageUrlById = new Map<string, string>();
        try {
          const assetImageUrls = await fetchFileUrls(assetImageFileStoreIds, employeeTenantId!, accessToken!, user);
          assetImageUrlById = new Map(
            (assetImageUrls.fileStoreIds ?? [])
              .filter((entry): entry is { id: string; url: string } => Boolean(entry.id && entry.url))
              .map((entry) => [entry.id, entry.url]),
          );
        } catch (error) {
          console.error("Failed to load asset media URLs for activity review:", error);
        }

        if (isSolar) {
          solarAssetSections = buildSolarAssetSections(assets, assetImageUrlById);
        } else {
          machineAssetData = buildMachineAssetData(assets, assetImageUrlById);
        }
      } catch (error) {
        console.error("Failed to load asset details for activity review:", error);
      }

      return buildActivityReviewDetail(
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
 * Lazily resolves one section's media on expand, not upfront — an
 * installation report can carry a lot of attachments, so loading every
 * section's documents on page open would slow the page down. Cached per
 * section so re-expanding doesn't re-fetch.
 */
export function useLoadSectionMedia(activityId: string, facilityName: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const queryClient = useQueryClient();

  return (section: ReviewSectionContent, documents: ActivityDocument[]) =>
    queryClient.fetchQuery({
      // `staleTime: Infinity` below means this cache entry is never
      // considered stale on its own — the sorted fileStoreIds are part of
      // the key so a resubmission with different attachments (same
      // activityId/section.id) lands on a fresh entry instead of reusing
      // stale resolved media.
      queryKey: [
        "ir-section-media",
        employeeTenantId,
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
        const response = await fetchFileUrls(fileStoreIds, employeeTenantId!, accessToken!, user);

        if (section.kind === "REPORT") {
          return buildReportSectionMedia(documents, response, facilityName);
        }
        if (section.kind === "IMAGE_CHECKLIST") {
          return buildImageChecklistMedia(documents, response);
        }
        // Machine's media groups are resolved eagerly from the asset search
        // (see buildMachineAssetData) — its own documents live on the
        // asset's `documents` array, not workflow documents, so there's
        // nothing for this lazy per-section load to add for it.
        return buildAssetSectionMedia(documents, response);
      },
      staleTime: Infinity,
    });
}

export function useSubmitActivityReview(activityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitActivityReviewInput) =>
      submitFacilityReview(input, employeeTenantId!, accessToken!, user),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ir-activity-review", employeeTenantId, activityId],
      });
    },
  });
}
