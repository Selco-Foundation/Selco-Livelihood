export interface ReviewerOption {
  code: string;
  name: string;
}

// Mock stand-in for an HRMS employee search scoped to the
// INSTALLATION_REPORT_APPROVER_QC_TEAM role — no HRMS integration exists
// yet; hardcoded until it's wired up.
export const REVIEWER_OPTIONS: ReviewerOption[] = [
  { code: "reviewer-1", name: "Priya Nair" },
  { code: "reviewer-2", name: "Arjun Mehta" },
  { code: "reviewer-3", name: "Fatima Sheikh" },
];
