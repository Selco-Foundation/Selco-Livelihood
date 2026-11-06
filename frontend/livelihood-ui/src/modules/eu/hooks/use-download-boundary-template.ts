import { useAuthStore } from "@/shared";
import { useMutation } from "@tanstack/react-query";
import { downloadBoundaryTemplate } from "../services/ingestion";

export function useDownloadBoundaryTemplate() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: () => downloadBoundaryTemplate(accessToken!, user),
  });
}
