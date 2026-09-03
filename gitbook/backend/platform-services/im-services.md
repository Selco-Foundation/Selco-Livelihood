# IM Services

`backend/e4h-services/im-services`

## What it does

Provides the ability to raise a complaint/grievance (a support ticket, in Livelihood terms) and track its progress, with notifications on status changes. In Livelihood this is the support-ticket (incident) service: ticket creation, auto-assignment to the asset's vendor, the full ticket workflow, and SLAs. Depends on `egov-user`, `egov-localization`, `egov-idgen`, `egov-mdms`, `egov-persister`, `egov-notification-sms`, `egov-notification-mail`, `egov-hrms`, and `egov-workflow-v2`.

## Where to look

- `backend/e4h-services/im-services/README.md`
- [LLDs → Livelihood core](../../LLDs/livelihood-core/README.md) for the full ticket lifecycle this service implements.
