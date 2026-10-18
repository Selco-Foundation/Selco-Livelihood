import { useAuthStore, type BoundaryDataNode } from "@/shared";
import { useMutation } from "@tanstack/react-query";
import { downloadFacilityTemplate } from "../services/ingestion";

/** Downloads the end-user template for the given geography tree (`buildBoundaryDataTree`). */
export function useDownloadFacilityTemplate() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (boundaryData: BoundaryDataNode) => downloadFacilityTemplate(accessToken!, user, boundaryData),
  });
}
