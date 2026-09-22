/** Renders an epoch-millis timestamp as `02 Sep 2026`, or `-` when absent — the
 *  display format shared by the projects, installation-plans and project-details
 *  screens. */
export function formatDate(value?: number) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
