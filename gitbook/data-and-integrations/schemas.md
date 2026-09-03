# Schemas

The definitive, code-grounded schema reference is `Z_docs/Z-Livelihood/LIVELIHOOD_SCHEMA_FROM_MIGRATIONS.sql` — the schema as actually reflected by the platform's Flyway migrations, not a hand-maintained ER diagram that can drift from the code. This page is a guide to what's in it, not a replacement for it.

## What's in the schema dump

Grouped by the area of the platform each table set belongs to:

| Area | Key tables |
|---|---|
| Boundary / geography | `boundary`, `boundary_hierarchy`, `boundary_relationship` |
| File storage | `eg_filestoremap` |
| ID generation | `id_generator` |
| Master data | `eg_mdms_schema_definition`, `eg_mdms_data` |
| Workflow engine | `eg_wf_processinstance_v2`, `eg_wf_document_v2`, `eg_wf_businessservice_v2`, `eg_wf_state_v2`, `eg_wf_action_v2`, `eg_wf_assignee_v2` |
| Facility | `facility_address`, `facility` |
| Assets | `asset`, `asset_documents` |
| HRMS | `eg_hrms_employee`, `eg_hrms_assignment`, `eg_hrms_educationaldetails`, `eg_hrms_departmentaltests`, `eg_hrms_empdocuments`, `eg_hrms_servicehistory`, `eg_hrms_jurisdiction`, `eg_hrms_deactivationdetails`, `eg_hrms_reactivationdetails` |
| Installation planning | `field_plans`, `field_plan_facilities` |
| Activities / installation execution | `activities`, `activity_assignments`, `facility_activities`, `bom`, `bom_document`, `activity_facility_transaction`, `activity_facility_transaction_comment`, `activity_facility_users` |
| Incidents (support tickets) | `eg_incident_v2`, `eg_incident_address_v2` |
| Project | `project_task`, `address` |

See [LLDs → Installation → Data model](../LLDs/installation/data-model.md) for how `field_plans`, `field_plan_facilities`, `facility_activities`, and `bom` are used and extended specifically for Installation, and [LLDs → Livelihood core](../LLDs/livelihood-core/README.md) for the incident tables.

## Migration philosophy

Across every module documented in this GitBook, the consistent pattern is **additive migration on existing tables** — new columns via Flyway `ALTER TABLE` — rather than new parallel schemas. New tables are introduced only where no existing table's shape can reasonably be stretched to fit; `installation_template` (Installation's expected bill-of-materials per Solution per site) is the clearest example of a genuinely new table under this principle.

## Where to look

- `Z_docs/Z-Livelihood/LIVELIHOOD_SCHEMA_FROM_MIGRATIONS.sql` — the full DDL.
- `docs/RowConstraintsGuide.md` — constraint conventions used across these schemas.
