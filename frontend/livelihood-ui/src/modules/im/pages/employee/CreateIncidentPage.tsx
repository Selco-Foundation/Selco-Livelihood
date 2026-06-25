import { contextPath, useTranslate } from "@/shared";
import { PageHeader } from "@/ui";
import { Link } from "@tanstack/react-router";
import { CreateTicketForm } from "../../components/create/CreateTicketForm";
import { IM_ROUTES } from "../../constants/routes";

function translateOr(
  t: (key: string) => string,
  key: string,
  fallback: string,
): string {
  const value = t(key);
  return value === key ? fallback : value;
}

export function CreateIncidentPage() {
  const { t } = useTranslate();
  const basePath = `/${contextPath()}`;
  const inboxPath = `${basePath}${IM_ROUTES.inbox}`;
  const responsePath = `${basePath}${IM_ROUTES.createResponse}`;

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <nav className="text-sm text-muted-foreground">
        <Link to={inboxPath} className="hover:text-primary">
          {translateOr(t, "ES_IM_TICKETS", "Tickets")}
        </Link>
        <span className="mx-2">&gt;</span>
        <span>{translateOr(t, "ES_IM_NEW_TICKET", "New Ticket")}</span>
      </nav>

      <PageHeader
        title={translateOr(t, "ES_IM_RAISE_NEW_TICKET", "Raise a New Ticket")}
        description={translateOr(
          t,
          "ES_IM_CREATE_DESCRIPTION",
          "Report an issue with your equipment or facility. We'll connect you with the right support team.",
        )}
      />

      <CreateTicketForm inboxPath={inboxPath} responsePath={responsePath} />
    </div>
  );
}
