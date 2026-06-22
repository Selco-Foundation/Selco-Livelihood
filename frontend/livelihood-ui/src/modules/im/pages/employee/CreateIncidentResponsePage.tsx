import { contextPath, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { IM_ROUTES } from "../../constants/routes";
import type { CreateIncidentResponse } from "../../types/create-incident";

const RESPONSE_STORAGE_KEY = "livelihood-im-create-response";

function translateOr(
  t: (key: string) => string,
  key: string,
  fallback: string,
): string {
  const value = t(key);
  return value === key ? fallback : value;
}

export function CreateIncidentResponsePage() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const basePath = `/${contextPath()}`;
  const homePath = `${basePath}/employee`;
  const inboxPath = `${basePath}${IM_ROUTES.inbox}`;

  const [response, setResponse] = useState<CreateIncidentResponse | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(RESPONSE_STORAGE_KEY);
    if (!raw) {
      void navigate({ to: inboxPath });
      return;
    }
    try {
      setResponse(JSON.parse(raw) as CreateIncidentResponse);
    } catch {
      sessionStorage.removeItem(RESPONSE_STORAGE_KEY);
      void navigate({ to: inboxPath });
    }
  }, [inboxPath, navigate]);

  const wrapper = response?.IncidentWrappers?.[0];
  const incidentId = wrapper?.incident?.incidentId;
  const isSuccess = Boolean(incidentId);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="livelihood-card p-8 text-center">
        <div
          className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-full ${
            isSuccess ? "bg-accent text-primary" : "bg-destructive/10 text-destructive"
          }`}
        >
          <CheckCircle2 className="size-8" />
        </div>

        <h1 className="text-xl font-semibold text-foreground">
          {isSuccess
            ? translateOr(t, "CS_COMMON_COMPLAINT_SUBMITTED", "Ticket submitted successfully")
            : translateOr(t, "CS_COMMON_COMPLAINT_NOT_SUBMITTED", "Ticket could not be submitted")}
        </h1>

        {isSuccess && incidentId ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {translateOr(t, "ES_COMMON_TRACK_COMPLAINT_TEXT", "Your ticket ID is")}{" "}
            <span className="font-semibold text-foreground">{incidentId}</span>
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline">
            <Link to={inboxPath}>
              {translateOr(t, "ES_IM_VIEW_INBOX", "View inbox")}
            </Link>
          </Button>
          <Button asChild>
            <Link to={homePath}>
              {translateOr(t, "CORE_COMMON_GO_TO_HOME", "Go to home")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
