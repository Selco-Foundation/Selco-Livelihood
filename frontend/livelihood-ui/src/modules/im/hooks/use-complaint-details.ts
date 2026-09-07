import { fetchFileUrls, fetchWorkflowBusinessService, useAuthStore } from "@/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LIVELIHOOD_INCIDENT_BUSINESS_SERVICE } from "../constants/workflow";
import { searchIncidentById } from "../services/incident-details";
import { searchWorkflowProcess } from "../services/workflow";
import type {
  ComplaintDetailsData,
  WorkflowDetailsData,
  WorkflowProcessInstance,
} from "../types/incident-details";
import { buildComplaintDetailsData } from "../utils/complaint-details";
import { mapVerificationMedia } from "../utils/verification-media";
import { buildWorkflowDetailsData } from "../utils/workflow-mapping";

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
      const fileIds = documents.map((doc) => doc.fileStoreId).filter(Boolean);
      const fileUrlResponse = await fetchFileUrls(
        fileIds,
        wrapper.incident.tenantId,
        accessToken!,
        user,
      );
      const media = mapVerificationMedia(documents, fileUrlResponse);

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
    queryFn: async (): Promise<WorkflowDetailsData> => {
      const workflowResponse = await searchWorkflowProcess(
        tenantId,
        incidentId,
        accessToken!,
        user,
      );
      const processInstances = workflowResponse.ProcessInstances ?? [];

      if (!processInstances.length) {
        return { timeline: [], nextActions: [], processInstances: [] };
      }

      const currentInstance = processInstances[0];
      const businessServiceName =
        currentInstance.businessService ?? LIVELIHOOD_INCIDENT_BUSINESS_SERVICE;

      const businessServiceResponse = await fetchWorkflowBusinessService(
        tenantId,
        businessServiceName,
        accessToken!,
        user,
      );

      const instancesWithMedia: WorkflowProcessInstance[] = [];
      for (const instance of processInstances) {
        if (!instance.documents?.length) {
          instancesWithMedia.push(instance);
          continue;
        }

        const ids = instance.documents.map((doc) => doc.fileStoreId).filter(Boolean);
        const fileUrlResponse = await fetchFileUrls(
          ids,
          instance.tenantId ?? tenantId,
          accessToken!,
          user,
        );
        const media = mapVerificationMedia(instance.documents, fileUrlResponse);

        instancesWithMedia.push({
          ...instance,
          thumbnailsToShow: {
            thumbs: media.thumbs,
            images: media.images,
            videos: media.videos,
          },
        });
      }

      return buildWorkflowDetailsData(
        currentInstance,
        businessServiceResponse,
        instancesWithMedia,
        businessServiceName,
      );
    },
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

    // `invalidateQueries` waits for the active `workflowQuery` above to settle, but
    // resolves even if that refetch failed — react-query keeps the last successful
    // data around on error, so a naive `getQueryData` read would silently hand back
    // the stale pre-action assignee. Check the query state's error first.
    const workflowQueryState =
      queryClient.getQueryState<WorkflowDetailsData>(workflowQueryKey);

    if (!workflowQueryState || workflowQueryState.error) {
      return undefined;
    }

    return workflowQueryState.data;
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
