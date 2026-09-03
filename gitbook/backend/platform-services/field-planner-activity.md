# Field Planner Activity

`backend/e4h-services/field-planner-activity`

## What it does

Owns installation execution: `facility_activities` (one row per installable component per site — Solar or Machine), `bom` (the IC Report record, 1:1 with a `facility_activities` row), the review/approval workflow, and the `installation_template` table (expected bill-of-materials per Solution per site).

## Documentation note

The service's own `README.md` is the same generic, unedited "Project Service" boilerplate shared with `field-planner`, `project`, and `amc-scheduler-service` — it does not describe this service's actual role. This page's description is grounded in [LLDs → Installation → Data model](../../LLDs/installation/data-model.md) instead.

## Where to look

- [LLDs → Installation](../../LLDs/installation/README.md) for the full design this service implements.
