import { employeeHomePath, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Skeleton, TopBar } from "@/ui";
import { OrganisationDetailView } from "../../components/details/OrganisationDetailView";
import { NoOrgAccess } from "../../components/NoOrgAccess";
import { useOwnOrganisationId } from "../../hooks/use-organisations";
import { hasOrgPocAccess } from "../../utils/access";

/**
 * Organisation POC / Vendor POC landing: resolves the organisation the
 * logged-in user belongs to and shows its user management.
 */
export function MyOrganisationPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { data: organisationId, isLoading, isError } = useOwnOrganisationId();

  if (!hasOrgPocAccess(user?.roles)) {
    return <NoOrgAccess />;
  }

  const title = translateOr(t, "ORG_MY_ORGANISATION", "My Organisation");
  const breadcrumbs = [
    { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
    { label: title },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <TopBar title={title} breadcrumbs={breadcrumbs} />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (isError || !organisationId) {
    return (
      <div className="flex flex-col gap-6">
        <TopBar title={title} breadcrumbs={breadcrumbs} />
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {isError
            ? translateOr(t, "ORG_EDIT_ORG_FETCH_FAILED", "We couldn't load your organisation. Please try again.")
            : translateOr(t, "ORG_NOT_LINKED", "Your account isn't linked to an organisation yet.")}
        </div>
      </div>
    );
  }

  return <OrganisationDetailView organisationId={organisationId} mode="poc" />;
}
