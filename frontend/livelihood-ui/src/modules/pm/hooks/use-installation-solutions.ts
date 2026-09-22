import { tenantId, useAuthStore } from "@/shared";
import { fetchInstallationSolutions, type InstallationSolution } from "@/shared/api/mdms";
import { useQuery } from "@tanstack/react-query";

/** The live `Installation.Solution` MDMS master — shared by `use-sectors.ts` (distinct
 *  `sectorName` values) and `TemplateStep` (solution code -> display name lookup). */
export function useInstallationSolutions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery<InstallationSolution[]>({
    queryKey: ["pm-installation-solutions"],
    queryFn: () => fetchInstallationSolutions(tenantId(), accessToken ?? undefined, user),
    staleTime: Infinity,
  });
}
