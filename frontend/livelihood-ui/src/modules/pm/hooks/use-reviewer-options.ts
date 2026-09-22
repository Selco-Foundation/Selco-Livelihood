import { useAuthStore } from "@/shared";
import { searchHrmsEmployees } from "@/shared/api/hrms";
import { useQuery } from "@tanstack/react-query";
import type { ReviewerOption } from "../constants/reviewers";

const INSTALLATION_REVIEWER_ROLE = "INSTALLATION_REPORT_APPROVER_QC_TEAM";

/**
 * Real HRMS employee search scoped to the Installation Reviewer role — the role *code* here is
 * genuinely `INSTALLATION_REPORT_APPROVER_QC_TEAM`, not `INSTALLATION_REVIEWER` (a proven trap:
 * the backend constant is misleadingly named after the screen wording but holds this value; using
 * the other string makes every Stage 4 vendor assignment fail `REVIEWER_MISSING`).
 */
export function useReviewerOptions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery<ReviewerOption[]>({
    queryKey: ["pm-reviewer-options"],
    enabled: Boolean(accessToken),
    queryFn: async () => {
      const employees = await searchHrmsEmployees(
        { roles: INSTALLATION_REVIEWER_ROLE, isActive: true },
        accessToken ?? "",
        user,
      );

      return employees
        .filter((employee) => employee.user?.uuid)
        .map((employee) => ({
          code: employee.user!.uuid!,
          name: employee.user?.name ?? employee.code ?? employee.user!.uuid!,
        }));
    },
  });
}
