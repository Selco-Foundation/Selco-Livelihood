import { useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAmcVisitWorkflow } from "../services/amc-visits";
import type { AmcReworkReason } from "../types/amc-visit";
import { toReworkComment } from "../utils/rework";
import { amcKeys } from "./query-keys";

export function useApproveAmcReport() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => updateAmcVisitWorkflow(reportId, "APPROVE", null, accessToken!, user),
    // Also after an error: a report already reviewed elsewhere then shows its real state.
    onSettled: () => queryClient.invalidateQueries({ queryKey: amcKeys.all }),
  });
}

/** Sends a report back to the field staff; the reasons travel as a JSON list in the workflow comment. */
export function useSendAmcReportForRework() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, reasons }: { reportId: string; reasons: AmcReworkReason[] }) =>
      updateAmcVisitWorkflow(reportId, "REJECT", toReworkComment(reasons), accessToken!, user),
    onSettled: () => queryClient.invalidateQueries({ queryKey: amcKeys.all }),
  });
}
