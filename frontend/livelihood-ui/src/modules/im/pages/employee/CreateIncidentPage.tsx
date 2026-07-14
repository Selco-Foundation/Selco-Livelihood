import { contextPath, employeeHomePath, translateOr, useTranslate } from "@/shared";
import { LanguageSwitcher } from "@/modules/core";
import { PageHeader } from "@/ui";
import { ImBreadcrumbs } from "../../components/ImBreadcrumbs";
import { CreateTicketForm } from "../../components/create/CreateTicketForm";
import { IM_ROUTES } from "../../constants/routes";

export function CreateIncidentPage() {
  const { t } = useTranslate();
  const basePath = `/${contextPath()}`;
  const homePath = employeeHomePath();
  const inboxPath = `${basePath}${IM_ROUTES.inbox}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <PageHeader
          title={translateOr(t, "ES_IM_RAISE_NEW_TICKET", "Raise a Ticket")}
          action={
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
          }
        />

        <ImBreadcrumbs
          items={[
            { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: homePath },
            { label: translateOr(t, "ES_IM_INBOX", "View all tickets"), to: inboxPath },
            { label: translateOr(t, "ES_IM_TICKET_CREATE", "Raise ticket") },
          ]}
        />
      </div>

      <CreateTicketForm inboxPath={inboxPath} />
    </div>
  );
}
