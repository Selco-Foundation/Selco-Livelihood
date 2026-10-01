import { reloadModule, useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadBoundaryData } from "../services/ingestion";
import { BOUNDARIES_QUERY_KEY } from "./use-boundaries";

export function useUploadBoundary() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadBoundaryData(file, accessToken!, user),
    onSuccess: async (result) => {
      if (!result.success) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: [BOUNDARIES_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ["boundary-hierarchy"] });
      await reloadModule("in");
    },
  });
}
