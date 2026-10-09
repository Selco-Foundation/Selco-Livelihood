import { employeeHomePath, translateOr, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

/** Shown when a user opens an org URL they don't have the role for (instead of a blank page). */
export function NoOrgAccess() {
  const { t } = useTranslate();

  return (
    <div className="livelihood-card flex flex-col items-center gap-4 px-6 py-16 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">
          {translateOr(t, "ORG_NO_ACCESS_TITLE", "You don't have access to this page")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {translateOr(t, "ORG_NO_ACCESS_DESC", "Contact your administrator if you think this is a mistake.")}
        </p>
      </div>
      <Button asChild variant="outline" size="lg">
        <Link to={employeeHomePath()}>{translateOr(t, "ORG_BACK_TO_HOME", "Back to Home")}</Link>
      </Button>
    </div>
  );
}
