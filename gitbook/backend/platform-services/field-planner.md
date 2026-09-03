# Field Planner

`backend/e4h-services/field-planner`

## What it does

Owns Installation Plans — `field_plans` **is** the Installation Plan (not a separate entity) — plus `field_plan_facilities`, the per-site scope and Solution-assignment table, including the site-lock mechanism that prevents a site being scoped into two active plans at once.

## Documentation note

The service's own `README.md` is a generic, unedited "Project Service" description identical to the one shipped in `field-planner-activity`, `project`, and `amc-scheduler-service` — it does not describe this service's actual Installation-planning role. This page's description is grounded in [LLDs → Installation → Data model](../../LLDs/installation/data-model.md) instead.

## Where to look

- [LLDs → Installation](../../LLDs/installation/README.md) for the full design this service implements.
