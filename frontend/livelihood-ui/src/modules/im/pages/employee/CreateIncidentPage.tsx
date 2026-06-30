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
    <div className="mx-auto max-w-[960px] space-y-6">
      <ImBreadcrumbs
        items={[
          { label: translateOr(t, "ES_COMMON_HOME", "Home"), to: homePath },
          { label: translateOr(t, "ES_IM_TICKET_CREATE", "Ticket create") },
        ]}
      />

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
