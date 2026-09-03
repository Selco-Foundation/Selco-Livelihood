# Installation

The Installation module takes facilities that passed Assessment and carries them through planning, vendor assignment, on-site installation, and review — ending with installed equipment handed off as tracked Assets ready for operations and support.

This section describes the **current design** for the module, consolidated from several rounds of design iteration into one coherent picture. It intentionally does not walk through the history of earlier drafts — where a design changed direction, only the current, superseding decision is documented. Anything not yet built is called out explicitly under [Known Limitations & In Progress](known-gaps.md) rather than described as working.

## Why the module reuses existing services

An early architectural review considered building a dedicated installation microservice, then rejected it: every entity the module needs (Project, Plan, Site, Vendor, Bill-of-Materials/IC Report, Asset) already had a natural home in an existing service, and two services in particular — `field-planner` and `field-planner-activity` — already contained purpose-built (if generic) scaffolding for exactly this kind of planning-and-execution workflow, including a pre-seeded "Installation" activity type. Building a new service would have meant re-implementing project/geography-scope handling, workflow integration, PDF generation, and facility linkage that already existed and were proven elsewhere in the platform.

**Decision: no new microservice.** The module is implemented as alterations (new columns, a small number of new tables) to existing services:

| Service | Role in Installation |
|---|---|
| `project` | Owns the Project entity — reused as-is, with two typed columns added. |
| `field-planner` | `field_plans` **is** the Installation Plan (not a separate entity); `field_plan_facilities` is the per-site scope + Solution assignment table. |
| `field-planner-activity` | Owns installation execution: `facility_activities` (one row per installable component per site), `bom` (the IC Report record), the review/approval workflow, and the new `installation_template` table. |
| `vendor-registry` | Owns Vendor Organisations and their jurisdiction/state assignment. |
| `asset-registry` | Receives the handoff: approved installation components create/activate Asset records. |
| `ingestion-service` | Provides the Excel download/upload round-trips used for site scoping and template configuration. |
| `egov-mdms-service-v2` | Hosts the Solution Repository (equipment bundles tagged by sector and sunshine-hour suitability). |
| `egov-workflow-v2` | Backs both the Plan-publish state machine and the IC Report review state machine. |
| `egov-otp` / `egov-notification-sms` | Provide the OTP acknowledgment step and its SMS delivery. |

See [Data Model & Service Ownership](data-model.md) for the schema-level detail and [Workflow & Roles](workflow-roles.md) for the state machines and role mapping.

## Pages in this section

- **[Data Model & Service Ownership](data-model.md)** — which service owns which entity, and the key schema additions.
- **[End-to-End Flow](flow.md)** — the Project Manager, Field Technician, and Installation Reviewer journeys, step by step.
- **[Workflow & Roles](workflow-roles.md)** — the two workflow-engine business services involved and the role-to-action mapping.
- **[Known Limitations & In Progress](known-gaps.md)** — parts of the design that are not yet implemented, or where the platform's live configuration diverges from this design.
