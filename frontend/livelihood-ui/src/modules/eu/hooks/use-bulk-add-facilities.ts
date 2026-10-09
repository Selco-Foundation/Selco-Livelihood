import { useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadFacilityData, validateFacilityData } from "../services/ingestion";
import { FACILITIES_QUERY_KEY } from "./use-facilities";

export interface BulkAddFacilitiesInput {
  file: File;
  areFacilitiesOnmReady: boolean;
}

export type BulkAddFacilitiesResult =
  | { status: "success"; resultFile: { blob: Blob; filename: string } }
  | { status: "invalid_data"; errorCount: number; resultFile: { blob: Blob; filename: string } };

/**
 * Validate the file first; if any rows failed, stop there and hand back the
 * annotated workbook (same "fix and re-upload" flow as boundaries). Only a
 * fully valid file moves on to the actual ingest call.
 */
export function useBulkAddFacilities() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, areFacilitiesOnmReady }: BulkAddFacilitiesInput): Promise<BulkAddFacilitiesResult> => {
      const validated = await validateFacilityData(file, accessToken!, user);

      if (validated.errorCount > 0) {
        return { status: "invalid_data", errorCount: validated.errorCount, resultFile: validated.file };
      }

      const uploaded = await uploadFacilityData(validated.file, areFacilitiesOnmReady, accessToken!, user);
      return { status: "success", resultFile: uploaded };
    },
    onSuccess: (result) => {
      if (result.status !== "success") {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: [FACILITIES_QUERY_KEY] });
    },
  });
}
