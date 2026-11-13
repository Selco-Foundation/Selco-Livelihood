import { useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveAmcReport, sendAmcReportForRework } from "../services/amc-reports";
import { amcKeys } from "./query-keys";

export function useApproveAmcReport() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => approveAmcReport(reportId, accessToken ?? undefined, user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: amcKeys.all }),
  });
}

export function useSendAmcReportForRework() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, reason }: { reportId: string; reason: string }) =>
      sendAmcReportForRework(reportId, reason, accessToken ?? undefined, user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: amcKeys.all }),
  });
}
