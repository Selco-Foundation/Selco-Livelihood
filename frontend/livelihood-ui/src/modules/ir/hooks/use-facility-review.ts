import { fetchFileUrls, useAuthStore } from "@/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MACHINE_MEDIA_GROUPS } from "../constants/review";
import { REJECTION_REASON_OPTIONS } from "../constants/rejection-reasons";
import { searchActivityFacilities } from "../services/facility";
import { submitFacilityReview } from "../services/review";
import {
  buildAssetSectionMedia,
  buildImageChecklistMedia,
  buildReportSectionMedia,
} from "../utils/facility-media";
import { buildFacilityReviewDetail } from "../utils/facility-review-mapping";
import type {
  ActivityDocument,
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

  return useQuery({
    queryKey: ["ir-facility-review", employeeTenantId, entryId],
    enabled: Boolean(accessToken && employeeTenantId && entryId),
    queryFn: async (): Promise<FacilityReviewDetail | null> => {
      const data = await searchActivityFacilities(
        { tenantId: employeeTenantId!, ids: [entryId] },
        { limit: 1, offset: 0 },
        accessToken!,
        user,
      );
      const row = data.facility?.[0];
      return row ? buildFacilityReviewDetail(row) : null;
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
