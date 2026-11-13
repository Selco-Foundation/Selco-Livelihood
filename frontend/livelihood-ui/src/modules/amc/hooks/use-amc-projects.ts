import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchAmcProjects } from "../services/amc-reports";
import { hasAmcReviewerAccess } from "../utils/access";
import { amcKeys } from "./query-keys";

export function useAmcProjects() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: amcKeys.projects(),
    enabled: Boolean(accessToken) && hasAmcReviewerAccess(user?.roles),
    queryFn: async () => (await searchAmcProjects(accessToken ?? undefined, user)).AmcProjects,
  });
}
