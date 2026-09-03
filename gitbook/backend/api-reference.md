# API reference

This page consolidates the platform's API surface by domain. It covers the endpoints that carry Livelihood-specific behavior — either new endpoints or existing platform endpoints with Livelihood-adapted payloads, validation, or filters — rather than re-documenting every generic platform endpoint from scratch.

## How to read these tables

- **Reused as-is** — the platform's existing generic endpoint, used with no Livelihood-specific change.
- **Modified** — same route, but the payload, validation, filters, workflow binding, or configuration is adapted for Livelihood. This does not necessarily mean a large refactor — often it's a new optional field or filter.
- **New** — an endpoint that did not exist before this program's requirements.

## Cross-service contract invariants

A few rules hold across every service in the API surface, because they encode the entity-model decisions in [LLDs → Livelihood core](../LLDs/livelihood-core/README.md):

- A support ticket always requires both `facilityId` and `assetId`, and the backend validates that the asset actually belongs to that facility before proceeding.
- The asset list shown in any "raise a ticket" UI is always fetched by facility (`criteria.facilityID`), never by vendor or globally.
- Auto-assignment on ticket creation always derives the assignee vendor from the selected asset — never from a facility-level default.
- Authentication is bearer-token based, consistent with the platform's employee-style auth model; OTP and QR-based flows are front-end orchestration on top of the same shared backbone services, not a separate auth stack.

For request/response payload shapes at the field level, treat the underlying service's own OpenAPI/Swagger contract (linked from each service's README under `backend/e4h-services/<service>/`, or under `docs/`) as the definitive source — this reference focuses on what each endpoint is for and how the pieces connect, not a field-by-field schema dump.

## Livelihood core APIs

### Facility service

| Capability | Method + route | Notes |
|---|---|---|
| Create facility | `POST /v2/facility/create` | Modified — Livelihood facility attributes plus manager contact fields |
| Update facility | `POST /v2/facility/update` | Modified |
| Search facility | `GET /v2/facility/search` | Modified filters: geography, project ID, program type |
| Bulk search | `POST /v2/facility/_bulk-search` | Modified |
| Bulk search with boundary | `POST /v2/facility/_bulk-search-with-boundary` | Modified |
| Resolve by manager mobile (optional) | `POST /v2/facility/_resolve-by-manager-mobile` | Optional bootstrap helper — not a link/mapping API |

### Asset registry

| Capability | Method + route | Notes |
|---|---|---|
| Create asset | `POST /v1/asset/_create` | Modified — requires `facilityId` + vendor mapping |
| Update asset | `POST /v1/asset/_update` | Modified |
| Search assets | `POST /v1/asset/_search?offset=&limit=` | Modified — standardized `criteria.facilityID` filter |
| Bulk create assets | `POST /v1/asset/bulk/_create` | Modified |
| QR resolve | `POST /v1/asset/qr/_resolve` | New — typically unauthenticated, used for QR-code ticket-raising entry |

### Vendor registry

| Capability | Method + route | Notes |
|---|---|---|
| Create vendor organisation | `POST /organisation/v1/_create` | Modified validations for Livelihood |
| Create/update org service offering | `POST /v1/_create`, `POST /v1/_update` | Modified offerings model |
| Vendors by facility (helper) | `POST /organisation/v1/vendors-by-facility` | Recommended helper for a Program POC's "assign vendor" screen |

### Project service

| Capability | Method + route | Notes |
|---|---|---|
| Create project | `POST /v1/_create` | Modified — justification code, multi-state geography |
| Update project | `POST /v1/_update` | Modified — justification-code immutability rules |
| Search projects | `POST /v1/_search` | Modified filters |
| Link facility to project | `POST /facility/v1/_create` | Modified validations |
| Create from justification (recommended) | `POST /v1/_create-from-justification` | New |
| Map by justification (recommended) | `POST /facility/v1/_map-by-justification` | New |

### Incident management (support tickets)

| Capability | Method + route | Notes |
|---|---|---|
| Create incident | `POST /v2/request/_create` | Modified — requires `facilityId` + `assetId`, auto-assigns vendor synchronously |
| Update incident (all workflow actions) | `POST /v2/request/_update` | Modified — every vendor/POC/manager/system action goes through this single route |
| Search incidents | `POST /v2/request/_search` | Modified — role-scoped filters (manager vs. vendor vs. Program POC) |
| Count incidents | `POST /v2/request/_count` | Modified |
| Sync boundary by facility | `POST /v2/request/_update-boundary-by-facility` | Keeps a ticket's boundary in sync if its facility's boundary changes |

**Minimal payload requirements.** Asset search for a "raise a ticket" screen: `POST /asset-registry/v1/asset/_search` with `criteria.facilityID`, paginated via `offset`/`limit`. Incident create must include at minimum `tenantId`, `Incident.facilityId`, `Incident.assetId`, `Incident.incidentType`/`incidentSubType` (master-data driven), and a start-transition workflow action — the backend validates asset-to-facility ownership, resolves the vendor from the asset, and sets the ticket to `PENDING_FOR_RESOLUTION`.

**Incident update (workflow actions)**, all through the one update endpoint: Vendor — `RESOLVE`, `OUT_OF_SCOPE`, `OUT_OF_WARRANTY` (with a quotation document), `DECLINE`; Program POC — `REASSIGN`, `ASSIGN_VENDOR`, `DECLINE_POC`; Facility manager — `REOPEN` (only within the 72-hour window); System — `AUTO_CLOSE`. Quotation documents are uploaded to file storage first; the incident update then references the returned file-store ID.

See [LLDs → Livelihood core](../LLDs/livelihood-core/README.md) for what each action does to ticket state.

## Installation APIs

Endpoints are grouped by the flow step they support — see [LLDs → Installation → Flow](../LLDs/installation/flow.md) for the full journey each fits into.

### Master data, vendor & role setup

| Capability | Method + route | Status | Notes |
|---|---|---|---|
| Search Solution Repository | `POST /mdms-v2/v1/_search` | Reused | Query with `moduleName: "Installation"`, `masterName: "Solution"`; filter by sector/sunshine-hours |
| Search Vendor Organisations | `POST /organisation/v1/_search` | Reused | Filter by `orgSubType: "INSTALLATION_VENDOR"` + state jurisdiction |
| Assign Reviewer / Field Technician roles | `POST /employees/_create` / `_update` | Modified | `egov-hrms` role assignment |

### Project Manager flow

| Capability | Method + route | Status | Notes |
|---|---|---|---|
| Create / update Project | `POST /project/v1/_create` / `_update` | Modified | Reuses existing justification-code / project-number generation |
| Download End User Site scope template | `POST /ingestion-service/template/facilitySelection` | Modified | |
| Upload Project site scope | `POST /ingestion-service/ingest/facilitySelection` | Modified | |
| Create / update Installation Plan | `POST /v1/field-plans/_create` / `_update` | Modified | |
| Assign Installation Reviewer | `POST /v1/activities/_assign-activity` | Reused | Plan-level assignment against the platform's pre-seeded Installation activity |
| Download Installation Scope template (Sheet 1) | `POST /ingestion-service/template/fieldplanFacilityIngestionTemplate` | Modified | |
| Bulk-assign Solution to sites | `POST /v1/field-plans/facility/bulk/_create` | Modified | |
| Upload Installation Scope (Sheet 1) | `POST /ingestion-service/ingest/fieldPlanfacilitiesValidateData` + `.../createFieldPlanFacility` | Modified | Two-step validate-then-create |
| Check End User Site lock status | `POST /v1/field-plans/facility/_lock-check` | New | Prevents a site being scoped into two active plans at once |
| Vendor Assignment (web UI, not Excel) | `POST /v1/bom/_update` | Modified | A direct Project Manager screen, not an Excel round-trip |
| Create / update / search BOM (Machine/Solar rows) | `POST /v1/bom/_create` / `_update` / `_search` | Modified | One row per split installable component |
| Download Installation Template | `POST /ingestion-service/template/installationTemplate` | New | |
| Upload Installation Template | `POST /ingestion-service/ingest/installationTemplate` | New | |
| CRUD Installation Templates | `POST /v1/installation-templates/_create` / `_update` / `_search` | New | |
| Publish validation check | `POST /v1/field-plans/{id}/_publish-validate` | New | Checklist: every site has a Solution, every row has a vendor + vendor email, every Solution has a completed template |
| Publish Plan (workflow transition) | `POST /egov-wf/process/_transition` | Reused | Fires the `PUBLISH` action on the `INSTALLATION_PLAN` business service |

### Field Technician flow

| Capability | Method + route | Status | Notes |
|---|---|---|---|
| Task inbox (search BOM) | `POST /v1/bom/_search` | Modified | |
| Send OTP | `POST /v1/bom/otp/_send` | Modified | Thin wrapper over the external OTP service's create call |
| Verify OTP | `POST /v1/bom/otp/_verify` | Modified | Thin wrapper over the external OTP service's validate call |
| Upload photo/video evidence | `POST /filestore/v1/files` | Reused | |
| Submit IC Report | `POST /v1/bom/_update` + asset creation + `POST /egov-wf/process/_transition` (`SUBMIT_REPORT`) | Modified | A single in-app Submit action |
| Generate Handover Letter PDF | `POST /v1/bom/_generate_pdf` / `_save_pdf` | Reused | |

### Installation Reviewer flow

| Capability | Method + route | Status | Notes |
|---|---|---|---|
| Review queue (search facility activity) | `POST /v1/bom/_search` | Modified | |
| Submit per-section reasons + Approve/Reject | `POST /activity/v1/activities/workflow/update` | Reused | Keyed on `facility_activities.id`; per-section reasons ride along in the existing transaction-comment payload |
| Workflow transition (internal) | `POST /egov-wf/process/_transition` | Reused | |

### Post-installation: handoff, audit, O&M eligibility

| Capability | Method + route | Status | Notes |
|---|---|---|---|
| Create/update handed-off Asset | `POST /v1/asset/_create` / `_update` | Reused | See [LLDs → Installation → Known gaps](../LLDs/installation/known-gaps.md) — this handoff is not yet fully wired |
| Set per-asset O&M eligibility | `POST /v1/asset/_update` | Reused | Sets `is_onm_ready = true` on the specific approved asset |
| Check per-asset O&M eligibility | `POST /v1/asset/_search` | Reused | Used by the ticket-raising eligibility gate and a chatbot's asset picker |
| Raise ticket (eligibility-gated) | `POST /v2/request/_create` | Modified | Gated by the per-asset O&M eligibility flag above |

### Scheduled notification jobs

Both jobs are implemented as scheduled reads/writes rather than new controllers — see [Workflows and crons](workflows-and-crons.md).
