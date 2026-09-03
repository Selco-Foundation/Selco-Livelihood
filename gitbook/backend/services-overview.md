# Services overview

The backend is split into two groups: **core services** (`backend/core-services/`), the shared DIGIT platform backbone vendored into this repo, and **platform services** (`backend/e4h-services/`), the domain services Livelihood builds on and extends. This page gives one to two truthful sentences per service, grounded in that service's own README where it has one.

## Core services

| Service | What it does |
|---|---|
| `boundary-service` | Provides the geography master (state/district/block) consumed by facility, vendor, asset, and RMS services. Its own README is a generic swagger-codegen server stub with no service-specific detail. |
| `egov-filestore` | File upload/download used across the platform for evidence photos, quotations, and generated letters, backed by S3/Azure/Minio/filesystem. |
| `egov-idgen` | Generates human-readable IDs (Project number, Plan ID, IC Report number, ticket ID) from configured ID formats, depending on `egov-mdms-service`. |
| `egov-mdms-service-v2` | The tenant-scoped master data service. Its README is missing entirely — this summary is grounded only in how other services describe consuming it. |
| `egov-notification-sms` | A Kafka consumer with no REST layer: reads from the SMS notification topic and hands off to a third-party SMS gateway. |
| `egov-workflow-v2` | The generic, config-driven workflow engine used by nearly every stateful process in the platform, depending on `egov-mdms` and `egov-user`. |
| `health-facility-registry` | Owns facility (end-user site) master data. Its README is a generic swagger-codegen server stub with no service-specific detail. |
| `zuul` | The API gateway fronting the backend services. Its repository folder ships only a `bin/` directory — no README or other documentation is present. |

See [Core services](core-services.md) for the per-service pages.

## Platform services

| Service | What it does |
|---|---|
| `amc-scheduler-service` | Owns scheduled/cron jobs, including AMC visit scheduling and the OTP client pattern Installation reuses. Its README is a generic, unedited "Project Service" boilerplate copied from another service — not descriptive of this service's actual purpose. |
| `asset-registry` | Owns assets (installed equipment), per-asset vendor mapping, warranty, and per-asset O&M eligibility. Its README is a generic swagger-codegen server stub with no service-specific detail. |
| `egov-hrms` | Manages all employees enrolled in the system — staff/role assignment, service history, jurisdiction — treatable as a subset of `egov-user`; every HRMS employee is also created as an `egov-user` user. |
| `field-planner` | Owns Installation Plans (`field_plans`) and plan-facility scope. Its README is the same generic, unedited "Project Service" boilerplate as `amc-scheduler-service` and `project` — not descriptive of its actual Installation-planning role. |
| `field-planner-activity` | Owns installation execution — installable components, IC Reports/BOM, the review workflow, and installation templates. Its README is the same generic, unedited "Project Service" boilerplate as `field-planner`. |
| `im-services` | Provides support-ticket (incident/grievance) raising and tracking, with citizen-facing notifications on status progress; depends on `egov-workflow-v2`, `egov-hrms`, and the notification services. |
| `im-services-analytics` | Runs the batch CO₂-emissions-avoided computation. Its README is a generic swagger-codegen server stub with no service-specific detail. |
| `inbox` | A generic aggregation service that combines workflow and domain-service search results into paginated inbox screens, depending on `workflow-v2`, the user service, and `egov-searcher`. |
| `ingestion-service` | The platform's only Python service (`uv`-managed), used for bulk Excel-based data loading and export across the platform. |
| `processor-services` | A supporting batch/processing service. No README is present in its folder — this summary is limited to what its presence in the repository confirms. |
| `project` | Owns Projects and project↔facility links. Its README is the same generic, unedited "Project Service" boilerplate shared with `field-planner`, `field-planner-activity`, and `amc-scheduler-service`. |
| `rms-service` | Collects telemetry from RMS devices (solar, inverter, battery, grid), applies anomaly-detection rules, de-duplicates, and auto-creates support tickets in the incident-management service. |
| `vendor-registry` | A generic organisation registry storing vendors, contractors, and community-based organisations, their contact details, tax identifiers, and areas of work. |

See [Platform services](platform-services.md) for the per-service pages.

## Honesty note on README quality

Several services in `backend/e4h-services/` (`amc-scheduler-service`, `field-planner`, `field-planner-activity`, `project`) currently ship an identical, unedited "Project Service" README that describes none of that service's actual behavior — it appears to be copy-pasted boilerplate left over from scaffolding. `egov-mdms-service-v2`, `zuul`, and `processor-services` have no README at all. Where this documentation describes what these services actually do, it draws on their usage elsewhere in the codebase and in this GitBook's other pages, not on their own README files.
