import { useAuthStore } from "@/shared";
import {
  createSolutionTemplate,
  downloadSolutionTemplate,
  validateSolutionTemplate,
} from "../services/installation-template";
import { useExcelRoundTrip } from "./use-excel-round-trip";

/**
 * Per-solution download/validate/create for the Template step.
 *
 * Unlike the other two round-trips this one is two-phase (`autoCreate: false`): validation stops at
 * a validated file, and creation happens on an explicit call. `createTemplate` reads that file from
 * this render's closure, so callers must invoke it from an effect keyed on the returned
 * `validatedFile` identity — not chained straight off `uploadAndValidate`'s promise, which would
 * capture a stale closure where it was still null.
 */
export function useSolutionTemplateUpload(planId: string | undefined, solutionCode: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const ready = Boolean(planId && accessToken);

  const roundTrip = useExcelRoundTrip<boolean>({
    autoCreate: false,
    download: ready ? () => downloadSolutionTemplate(planId!, solutionCode, accessToken!, user) : null,
    validate: ready ? (file) => validateSolutionTemplate(file, planId!, solutionCode, accessToken!, user) : null,
    create: ready ? (validated) => createSolutionTemplate(planId!, solutionCode, validated, accessToken!, user) : null,
    messages: {
      downloadFailed: "Failed to download the template",
      uploadFailed: "IC report template validation failed",
      createFailed: "IC report template creation failed",
    },
  });

  return {
    ...roundTrip,
    createTemplate: async () => (await roundTrip.createFromValidated()) ?? false,
  };
}
