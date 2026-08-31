import { useAuthStore } from "@/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { REJECTION_REASON_OPTIONS } from "../services/fixtures";
import { fetchFacilityReviewDetail, submitFacilityReview } from "../services/review";
import type { SubmitFacilityReviewInput } from "../types/facility-review";

/** Dummy implementation — returns the fixtured MDMS `Installation.RejectionReasons` list. */
export function useRejectionReasonOptions() {
  return REJECTION_REASON_OPTIONS;
}

export function useFacilityReview(entryId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["ir-facility-review", entryId],
    enabled: Boolean(accessToken && entryId),
    queryFn: () => fetchFacilityReviewDetail(entryId, accessToken!, user),
  });
}

export function useSubmitFacilityReview() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (input: SubmitFacilityReviewInput) =>
      submitFacilityReview(input, accessToken!, user),
  });
}
