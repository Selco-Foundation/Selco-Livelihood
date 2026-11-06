import { useAuthStore } from "@/shared";
import { useMutation } from "@tanstack/react-query";
import { downloadFacilityTemplate } from "../services/ingestion";

/** Downloads the end-user template for the given geography codes (`buildBoundaryCodeSelection`). */
export function useDownloadFacilityTemplate() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (boundaryCodes: string[]) => downloadFacilityTemplate(accessToken!, user, boundaryCodes),
  });
}
