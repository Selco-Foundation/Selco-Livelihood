import { useAuthStore } from "@/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  resolveVerificationMedia,
  searchIncidentById,
} from "../services/incident-details";
import { fetchWorkflowDetails } from "../services/workflow";
import type {
  ComplaintDetailsData,
  WorkflowDetailsData,
} from "../types/incident-details";
import { buildComplaintDetailsData } from "../utils/complaint-details";

export function useComplaintDetails(incidentId: string, tenantId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const complaintQuery = useQuery({
    queryKey: ["complaint-details", tenantId, incidentId],
    enabled: Boolean(accessToken && tenantId && incidentId),
    queryFn: async (): Promise<ComplaintDetailsData> => {
      const response = await searchIncidentById(
        tenantId,
        incidentId,
        accessToken!,
        user,
      );
      const wrapper = response.IncidentWrappers?.[0];
      if (!wrapper) {
        throw new Error("COMPLAINT_NOT_FOUND");
      }

      const documents = wrapper.incident.additionalDetail?.fileStoreId ?? [];
      const media = await resolveVerificationMedia(
        documents,
        wrapper.incident.tenantId,
        accessToken!,
        user,
      );

      return buildComplaintDetailsData(
        incidentId,
        wrapper.incident,
        wrapper.workflow,
        {
          images: media.images,
          videos: media.videos,
          thumbnails: media.thumbs,
        },
        (key) => key,
      );
    },
  });

  const workflowQueryKey = ["workflow-details", tenantId, incidentId];

  const workflowQuery = useQuery({
    queryKey: workflowQueryKey,
    enabled: Boolean(accessToken && tenantId && incidentId),
    queryFn: () =>
      fetchWorkflowDetails(tenantId, incidentId, accessToken!, user),
  });

  const revalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["complaint-details", tenantId, incidentId],
      }),
      queryClient.invalidateQueries({ queryKey: workflowQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["im-inbox"] }),
      queryClient.invalidateQueries({ queryKey: ["im-inbox-summary"] }),
    ]);

    // `invalidateQueries` waits for the active `workflowQuery` above to refetch,
    // so the cache already holds the post-action assignee by the time we read it.
    return queryClient.getQueryData<WorkflowDetailsData>(workflowQueryKey);
  };

  return {
    complaintDetails: complaintQuery.data,
    workflowDetails: workflowQuery.data,
    isLoading: complaintQuery.isLoading || workflowQuery.isLoading,
    isError: complaintQuery.isError || workflowQuery.isError,
    error: complaintQuery.error ?? workflowQuery.error,
    revalidate,
  };
}
