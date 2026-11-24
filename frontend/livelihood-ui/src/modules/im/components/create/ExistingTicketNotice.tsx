import { contextPath, translateOr, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { Link } from "@tanstack/react-router";
import { ArrowRight, TriangleAlert } from "lucide-react";
import type { ExistingTicket } from "../../utils/duplicate-ticket";

interface ExistingTicketNoticeProps {
  readonly ticket: ExistingTicket;
}

function existingTicketPath(ticket: ExistingTicket): string {
  return `/${contextPath()}/employee/im/complaint/details/${ticket.ticketId}/${ticket.ticketTenantId}`;
}

export function ExistingTicketNotice({ ticket }: ExistingTicketNoticeProps) {
  const { t } = useTranslate();
  const detailsPath = existingTicketPath(ticket);

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-warning-foreground/30 bg-warning/60 px-4 py-3 sm:flex-row sm:items-center"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-warning text-warning-foreground">
        <TriangleAlert className="size-4" />
      </span>
      <p className="min-w-0 flex-1 text-sm text-foreground/80 wrap-anywhere">
        <span className="font-semibold text-foreground">
          {translateOr(t, "IM_DUPLICATE_TICKET_DETECTED", "Duplicate Ticket Detected:")}
        </span>{" "}
        {translateOr(
          t,
          "IM_DUPLICATE_TICKET_EXISTS",
          "You already have a ticket raised for this asset with the same issue. Please refer to the existing ticket:",
        )}{" "}
        <Link
          to={detailsPath}
          target="_blank"
          className="font-semibold text-foreground underline underline-offset-2 hover:no-underline"
        >
          {ticket.ticketId}
        </Link>{" "}
        <span className="inline-flex items-center gap-1 rounded-full border border-success-foreground/20 bg-success px-2 py-0.5 align-middle text-xs font-medium text-success-foreground">
          <span className="size-1.5 rounded-full bg-success-foreground" aria-hidden />
          {translateOr(t, "IM_TICKET_IN_PROGRESS", "In Progress")}
        </span>
      </p>
      <Button asChild size="sm" className="shrink-0 gap-1.5">
        <Link to={detailsPath} target="_blank">
          {translateOr(t, "IM_VIEW_TICKET", "View Ticket")} {ticket.ticketId}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
