# Repository map

This page is a guided tour of the top-level folders in the repository, so a new contributor can find their way without guessing.

## `backend/core-services/`

The shared DIGIT platform backbone, vendored directly into this repo rather than pulled in as an external dependency:

- `boundary-service` — geography master (state/district/block)
- `egov-filestore` — file upload/download for evidence photos, quotations, generated letters
- `egov-idgen` — human-readable ID generation
- `egov-mdms-service-v2` — tenant-scoped master data service
- `egov-notification-sms` — Kafka-consuming SMS transport
- `egov-workflow-v2` — the generic, config-driven workflow engine
- `health-facility-registry` — facility (end-user site) master data
- `zuul` — the API gateway fronting the backend services

## `backend/e4h-services/`

The domain services Livelihood builds on and extends. (The folder name `e4h-services` is inherited from the shared codebase's origin and is a path only — it is not a Livelihood product name.)

- `amc-scheduler-service` — scheduled/cron jobs
- `asset-registry` — installed equipment, vendor mapping, warranty
- `egov-hrms` — staff/employee records and role assignment
- `field-planner` — Installation Plans (`field_plans`)
- `field-planner-activity` — installation execution, IC Reports/BOM, review workflow
- `im-services` — support tickets (incidents)
- `im-services-analytics` — batch CO₂-emissions-avoided computation
- `inbox` — generic search/workflow aggregation for inbox-style screens
- `ingestion-service` — the platform's Python (uv-managed) bulk Excel ingestion service
- `processor-services` — supporting batch/processing service
- `project` — Projects and project↔facility links
- `rms-service` — remote-monitoring telemetry, anomaly rules, auto-ticketing
- `vendor-registry` — vendor and platform organisations

## `frontend/`

- `micro-ui` — the shared DIGIT UI Core module framework other frontends and platform-standard admin/workbench screens are built from
- `installation-ui` — the installation planning, execution, and review web app
- `livelihood-ui` — the primary Livelihood-specific web app (facility managers, Program POCs, vendors, admin)

There is no mobile or Flutter application in this repository — installation field work and support-ticket flows are delivered through these web apps, used on mobile browsers where needed.

## `docs/`

Service-specific reference material maintained alongside individual services: API specs (OpenAPI YAML for asset-registry, facility-registry, project-service), the Assessment module LLD, RMS CO₂/gating/pause LLDs, a row-constraints guide, and UI sequence diagrams.

## `Z_docs/`

Design-in-progress source material this GitBook draws on and consolidates into a more navigable, review-ready form:

- `Z_docs/Livelihood_installation/` — Installation module LLDs, flow diagrams, API doc, and PRD.
- `Z_docs/Livelihood_Admin/` — the Admin module LLD and PRD.
- `Z_docs/Z-Livelihood/` — platform-wide design notes: the workflow/SLA LLD, platform-changes-vs-baseline notes, the API specs, and `LIVELIHOOD_SCHEMA_FROM_MIGRATIONS.sql` (the schema as actually reflected by Flyway migrations), plus the indexer and persister configuration notes.

Content in `Z_docs/` represents design drafts and working notes, not always the final or fully implemented state — where this GitBook relocates or summarizes it, it calls out known gaps explicitly rather than presenting drafts as shipped functionality.
