# Data Model & Service Ownership

## Core entities and where they live

| Entity | Table | Service | Notes |
|---|---|---|---|
| Project | `project` | `project` | Reused as-is; carries a `justificationCode` (in `additionalDetails`) and a human-readable `projectNumber`. |
| Installation Plan | `field_plans` | `field-planner` | Not a separate entity from the platform's general-purpose field plan — the Installation Plan **is** a `field_plans` row, with added columns. |
| Plan × Site scope | `field_plan_facilities` | `field-planner` | Plan-to-facility inclusion, plus the assigned Solution and a site lock flag. |
| Installable component | `facility_activities` | `field-planner-activity` | One row per **vendor-assignable component** at a site — see below. |
| IC Report / BOM | `bom` | `field-planner-activity` | The Installation Completion Report record, 1:1 with a `facility_activities` row. |
| Installation Template | `installation_template` | `field-planner-activity` | New table — the expected bill-of-materials for a Solution at a site. |
| Vendor Organisation | `eg_org` | `vendor-registry` | Reused; `org_subtype` includes `INSTALLATION_VENDOR`; jurisdiction rows carry assigned states. |
| Asset | `asset` | `asset-registry` | The handoff target — approved installation components become/activate Asset rows. |
| Solution Repository | MDMS (`Installation.Solution`) | `egov-mdms-service-v2` | Equipment bundles tagged by sector and sunshine-hour suitability; not a bespoke table. |

## Why installation components are split per site

Each site's installation work is split into **exactly two** `facility_activities` rows: one for `SOLAR`, one for `MACHINE`. This split — rather than one row per site — is what lets Machine and Solar equipment at the same site be independently vendor-assigned and independently reviewed/approved, matching the requirement that Machine and Solar installations at one site can go to two different vendors and progress on separate timelines. A Solution with more than one physical machine (for example, an oil mill = press + pounding machine) still gets only one `MACHINE` row — the individual machines stay bundled together as line items inside that row's IC Report data, they are not split further.

Each `facility_activities` row has exactly one `bom` row (its IC Report) and its own independent workflow process instance, keyed on `facility_activities.id`. This is the same keying the review workflow already used before the split — the split only multiplies how many independent instances exist per site, it does not introduce a new integration layer.

## Key schema additions

**`field_plans`** (Installation Plan) — existing table, altered:
- `uuid` — a separate collision-proof technical identifier, since `field_plans.id` is repurposed to hold a human-readable Plan ID (e.g. `IP-2026-001`) rather than a random UUID.
- `sector` — the Plan's single sector.
- `published_time`, plus last-notified timestamps for the two weekly summary notification jobs (see [Workflow & Roles](workflow-roles.md)).
- `status` (existing column) is reused directly for the Draft → Published lifecycle rather than adding a new column.

**`field_plan_facilities`** (Plan × Site) — existing table, altered:
- `solution_id` — the MDMS Solution assigned to this site.
- `lock_status` — `UNLOCKED` / `LOCKED`; a site is locked while installation work is in progress under this plan, so it cannot simultaneously be scoped into another active plan.

**`facility_activities`** — existing table, altered:
- `component_type` — `SOLAR` | `MACHINE`, the discriminator that implements the per-site split described above.
- `component_name`, `solution_id` — denormalized identifying fields for the component.
- The table's uniqueness constraint is extended (not dropped) so this intentional two-row-per-site split for Installation coexists with the existing one-row-per-(facility, activity, plan) invariant every other activity type still relies on.

**`bom`** (IC Report) — existing table, altered:
- `solution_id`, `vendor_org_id`, `vendor_email`, `vendor_phone` — vendor assignment, captured directly through a Project Manager web screen rather than an Excel round-trip.
- `otp_uuid` — reference to the external OTP service's create response (the OTP service itself owns hashing/expiry/matching).
- `report_number` — a system-generated, unique IC Report identifier.
- `data` (existing, freeform JSON) continues to carry the actual BOM confirmations and site-captured parameters the Field Technician enters; its shape mirrors the Installation Template's line-item structure.

**`installation_template`** — new table: one row per (facility, plan, solution), holding `machine_section` and `solar_section` (arrays of expected line items — product, make, capacity, quantity) plus tender/purchase-order numbers.

## ID conventions

New tables use a native UUID primary key. Columns referencing existing platform tables keep the type those tables already use (`VARCHAR`, the platform-wide convention) — the one deliberate exception is `field_plans.id`, whose *content* switches from a random UUID to a human-readable, ID-generator-produced Plan ID, while its column type is unchanged.

## Per-section review, without a new table

The Installation Reviewer's per-section (specs / photos / video / handover letter) approve-or-reject granularity does not require a new table. It reuses the platform's existing transaction-comment mechanism that the review workflow already writes to on every Approve/Reject action — the section-name convention is simply relabeled for this feature rather than replaced with new schema.

## Audit trail, without a new table

Asset handoff's audit trail (who approved what, when) does not need a bespoke table either — the workflow engine's own process-instance history already records every transition against each `facility_activities` row, and is treated as the audit trail for this feature.
