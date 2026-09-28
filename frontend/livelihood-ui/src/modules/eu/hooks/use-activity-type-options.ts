import { fetchMdmsMasters, tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";

export interface ActivityTypeOption {
  code: string;
  name: string;
}

/** The `common-masters.Activities` MDMS master for the activity-type dropdown — AMC is excluded since it isn't part of Livelihood. */
export function useActivityTypeOptions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ["eu-activity-type-options"],
    enabled: Boolean(accessToken),
    queryFn: () =>
      fetchMdmsMasters(tenantId(), "common-masters", ["Activities"], accessToken ?? undefined, user),
  });

  const activityTypes = ((data?.Activities as ActivityTypeOption[] | undefined) ?? []).filter(
    (activity) => activity.code !== "AMC",
  );

  return { isLoading, activityTypes };
}
