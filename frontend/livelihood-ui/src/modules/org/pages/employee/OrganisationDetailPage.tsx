import { useAuthStore } from "@/shared";
import { useLocation } from "@tanstack/react-router";
import { OrganisationDetailView } from "../../components/details/OrganisationDetailView";
import { NoOrgAccess } from "../../components/NoOrgAccess";
import { hasOrgSuperAdminAccess } from "../../utils/access";

// This route's path is computed at runtime via contextPath(), so there's no static
// `Route` export for typed params — read the id from the current location instead.
function useOrganisationIdFromRoute(): string {
  const pathname = useLocation({ select: (location) => location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  const index = segments.indexOf("organisations");
  return index >= 0 ? decodeURIComponent(segments[index + 1] ?? "") : "";
}

export function OrganisationDetailPage() {
  const user = useAuthStore((state) => state.user);
  const organisationId = useOrganisationIdFromRoute();

  if (!hasOrgSuperAdminAccess(user?.roles)) {
    return <NoOrgAccess />;
  }

  // `key` remounts the view (and its dialogs' state) when navigating between organisations.
  return <OrganisationDetailView key={organisationId} organisationId={organisationId} mode="admin" />;
}
