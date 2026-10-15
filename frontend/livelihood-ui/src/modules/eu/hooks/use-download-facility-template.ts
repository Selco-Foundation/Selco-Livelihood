import { useAuthStore } from "@/shared";
import { useMutation } from "@tanstack/react-query";
import { downloadFacilityTemplate } from "../services/ingestion";

export function useDownloadFacilityTemplate() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: () => downloadFacilityTemplate(accessToken!, user),
  });
}
