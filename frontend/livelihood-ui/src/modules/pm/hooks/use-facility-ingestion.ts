import { useAuthStore } from "@/shared";
import {
  createFacilitiesAndUpdateProject,
  downloadFacilityIngestionTemplate,
  validateFacilitiesExcel,
} from "../services/ingestion";
import type { GeographyDetails } from "../types/project";
import { useExcelRoundTrip } from "./use-excel-round-trip";

/** End-user data step: download a facility template, then validate and apply a clean file. */
export function useFacilityIngestion(projectId: string | undefined, geographyDetails: GeographyDetails) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const ready = Boolean(projectId && accessToken);

  return useExcelRoundTrip({
    download: ready
      ? () => downloadFacilityIngestionTemplate(projectId!, geographyDetails, accessToken ?? undefined, user)
      : null,
    validate: ready ? (file) => validateFacilitiesExcel(file, projectId!, accessToken!, user) : null,
    create: ready
      ? async (validated) => {
          const file = await createFacilitiesAndUpdateProject(validated, projectId!, accessToken!, user);
          return { result: undefined, file };
        }
      : null,
    messages: {
      downloadFailed: "Failed to download the template",
      uploadFailed: "Facility ingestion failed",
    },
  });
}
