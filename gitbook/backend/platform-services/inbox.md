# Inbox

`backend/e4h-services/inbox`

## What it does

A generic aggregation service that combines domain-service and workflow search results against a complex search criteria, returning paginated applications/workflow data plus a total count. Depends on `egov-workflow-v2`, the user service, `egov-searcher`, and whichever domain service has inbox configuration added for it. Used to power inbox-style screens across modules; optional per module rather than mandatory.

## Where to look

- `backend/e4h-services/inbox/README.md`
