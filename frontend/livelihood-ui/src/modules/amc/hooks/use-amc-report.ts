import { fetchFileUrls, tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchAmcVisits } from "../services/amc-visits";
import { hasAmcReviewerAccess } from "../utils/access";
import { toAmcReport } from "../utils/visit-mapping";
import { amcKeys } from "./query-keys";

/** One AMC report with its site details, answers, photos, failed rules and history. */
export function useAmcReport(reportId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.report(reportId),
    enabled: Boolean(reportId && accessToken) && hasAmcReviewerAccess(user?.roles),
    queryFn: () =>
      searchAmcVisits(
        { tenantId: tenantId(), ids: [reportId!], includeSiteDetails: true },
        { limit: 1, offset: 0 },
        accessToken!,
        user,
      ),
    select: (response) => {
      const visit = response.ScheduledVisits?.[0];
      return visit ? toAmcReport(visit) : null;
    },
  });
}

/** Signed download links for filestore ids (report photos, the report PDF), keyed by id. */
export function useAmcFileUrls(fileStoreIds: string[]) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.files(fileStoreIds),
    enabled: Boolean(accessToken) && fileStoreIds.length > 0,
    // Filestore links are signed and expire; refetch rather than keep them for long.
    staleTime: 5 * 60_000,
    queryFn: () => fetchFileUrls(fileStoreIds, tenantId(), accessToken!, user),
    select: (response) =>
      Object.fromEntries(
        (response.fileStoreIds ?? []).flatMap((entry) => (entry.id && entry.url ? [[entry.id, entry.url]] : [])),
      ) as Record<string, string>,
  });
}
