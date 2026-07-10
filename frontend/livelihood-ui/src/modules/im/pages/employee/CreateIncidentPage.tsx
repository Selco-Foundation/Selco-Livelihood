import { contextPath, employeeHomePath, useTranslate } from "@/shared";
import { PageHeader } from "@/ui";
import { ImBreadcrumbs } from "../../components/ImBreadcrumbs";
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
  const homePath = employeeHomePath();
  const inboxPath = `${basePath}${IM_ROUTES.inbox}`;
  const responsePath = `${basePath}${IM_ROUTES.createResponse}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateOr(t, "ES_IM_RAISE_NEW_TICKET", "Raise a Ticket")}
      />

      <ImBreadcrumbs
        items={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: homePath },
          { label: translateOr(t, "ES_IM_INBOX", "View all tickets"), to: inboxPath },
          { label: translateOr(t, "ES_IM_TICKET_CREATE", "Raise ticket") },
        ]}
      />

      <CreateTicketForm inboxPath={inboxPath} responsePath={responsePath} />
    </div>
  );
}
