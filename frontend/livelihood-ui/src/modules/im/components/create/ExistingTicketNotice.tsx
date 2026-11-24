import { contextPath, translateOr, useTranslate } from "@/shared";
import { Link } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
import type { ExistingTicket } from "../../utils/duplicate-ticket";

interface ExistingTicketNoticeProps {
  readonly ticket: ExistingTicket;
}

export function ExistingTicketNotice({ ticket }: ExistingTicketNoticeProps) {
  const { t } = useTranslate();
  const detailsPath = `/${contextPath()}/employee/im/complaint/details/${ticket.ticketId}/${ticket.ticketTenantId}`;

  return (
    <div
      role="alert"
      className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 wrap-anywhere">
        {translateOr(
          t,
          "IM_DUPLICATE_TICKET_EXISTS",
          "You already have a ticket raised for this asset with the same issue. Please refer to the existing ticket:",
        )}{" "}
        <Link
          to={detailsPath}
          target="_blank"
          className="font-medium underline underline-offset-2 hover:no-underline"
        >
          {ticket.ticketId}
        </Link>
      </p>
    </div>
  );
}
