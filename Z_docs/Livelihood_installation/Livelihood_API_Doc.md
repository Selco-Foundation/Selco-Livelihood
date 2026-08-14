# Livelihood Installation App — API Design Doc

Companion doc to `Livelihood_Installation_App_PRD.pdf`, `Livelihood_Installation_LLD.md`, and `Livelihood_Installation_Flow_Diagrams.md`. Lists every API needed to fulfill the PRD, cross-checked against the actual controllers and DB migrations already in this repo, so each entry is tagged **🆕 New**, **♻️ Reuse as-is**, or **🔧 Reuse + Extend**.

**Structure of this doc**: §3 covers cross-cutting setup APIs (master data, vendor lookup, role assignment) that every flow below depends on. §4–§7 walk each actor's flow **in the same order and grouping as `Livelihood_Installation_Flow_Diagrams.md`**, so a step number there maps directly to a subsection here (e.g. Flow Diagrams "PM flow Step 8" ≡ API Doc §4.9). §8 covers the two scheduled jobs, which have no dedicated controller of their own but were previously undocumented in this file. §9 is a compact table→API cross-reference for "which table does X get written to." §10 is cross-cutting notes that don't belong to one single API.

Each API entry carries a **DB Write** line stating exactly which table/column it writes (or confirms it's read-only) — see §9 for how these were verified against the repo's migration SQL, not just the LLD's proposed schema.

---

## 1. Conventions

All APIs (except the Python `ingestion-service`) follow the standard DIGIT envelope:

**Request** wraps a `RequestInfo`:
```json
{
  "RequestInfo": {
    "apiId": "installation-app",
    "ver": "1.0",
    "ts": 1721654400000,
    "authToken": "<user-auth-token>",
    "userInfo": { "uuid": "8a9a1c2e-...-hrms-user" }
  }
}
```

**Response** wraps a `ResponseInfo`:
```json
{
  "ResponseInfo": {
    "apiId": "installation-app",
    "ver": "1.0",
    "ts": 1721654400500,
    "status": "successful"
  }
}
```
These wrappers are omitted from the samples below for brevity — assume every request/response includes them.

**Status legend**

| Tag | Meaning |
|---|---|
| ♻️ **Reuse as-is** | Existing endpoint, existing request/response shape, no code change needed. |
| 🔧 **Reuse + Extend** | Existing endpoint, but the request/response model needs new fields. |
| 🆕 **New** | Endpoint does not exist today; needs to be built (usually by copying an existing sibling controller's pattern in the same service). |

**DB Write legend** (used in every entry below, verified against this repo's Flyway migrations, not just the LLD's proposed DDL):

- **✅** — column/table exists today in a checked-in migration.
- **🆕** — column/table is proposed by the LLD (§3.x) but was not found in any migration in this repo — the write has nowhere to land until that `ALTER TABLE`/`CREATE TABLE` is added.
- **No (read-only)** — the call only reads, never writes.

**`ingestion-service` conventions** (corrects earlier drafts of this doc, which invented an `INVALID_TEMPLATE` JSON error code that doesn't actually exist in this codebase):

- `ingestion-service` has **no database of its own** — every endpoint is stateless, calling other services' create/update/search APIs per row.
- Column definitions and validation rules for every template are **not hardcoded in Python** — they're MDMS master data, schema code `data-ingestion.<Name>Schema` (e.g. `data-ingestion.FacilityIngestionSchema`), fetched live via `MDMSClient.get_column_definitions_and_row_constraints_with_metadata()`. A new template type is added by authoring a new schema JSON (see `docs/ingestion/schema/*.json` for the existing shape) and registering it in MDMS — the generic `validate_columns()`/`validate_row_constraints()` functions in `app/utils/facility_validator.py` then work unchanged. Only the per-row payload-construction/API-call logic (`app/utils/convertor.py`-style functions) is genuinely new code per template.
- **Upload responses are the re-annotated workbook itself, not a JSON body.** Every existing ingest endpoint returns the uploaded `.xlsx` back as a `FileResponse`, with a `status` column (`PASSED`/`FAILED`, or `success`/`failed` for per-row API-call flows) and an `error` column (deduplicated, semicolon-joined messages) filled in per row — not a JSON error list. The samples below show this as an annotated-file response rather than JSON, to match reality.
- **Kafka**: every write path actually audited in `project`, `field-planner`, `field-planner-activity`, `egov-workflow-v2`, and `asset-registry` calls `producer.push(topic, entity)` (via `GenericRepository.save()` or a direct `Producer` field) with **zero** `INSERT`/`UPDATE`/`jdbcTemplate.update(...)` calls found in any create/update path across those five services — every DB Write below is therefore asynchronous (Kafka producer → external `egov-persister`), not a synchronous row write in the request thread. `_search` reads are the only place these services touch the DB directly. See `Livelihood_Installation_Flow_Diagrams.md` for the topic-by-topic Kafka evidence (file:line citations) — not repeated per-entry here to avoid duplicating that doc.

---

## 2. API Summary

| # | Method | Path | Service | Status | PRD ref | Purpose |
|---|---|---|---|---|---|---|
| 1 | POST | `/mdms-v2/v1/_search` | egov-mdms-service-v2 | ♻️ | FR-01 | Search Solution Repository |
| 2 | POST | `/organisation/v1/_search` | vendor-registry | ♻️ | FR-07 | Find Vendor Organisations eligible by State (no Asset Type dimension — any vendor can handle either) |
| 3 | POST | `/employees/_create` / `_update` | egov-hrms | 🔧 | FR-04, §5 | Assign `INSTALLATION_REVIEWER` / `FIELD_TECHNICIAN` roles |
| 4 | POST | `/project/v1/_create` / `_update` | project | 🔧 | FR-02, FR-03 | Create/update Project — reuses existing `justificationCode`/`projectNumber`, no new fields |
| 5 | POST | `/ingestion-service/template/facilitySelection` | ingestion-service | 🔧 | FR-03 | Download End User Site scope Excel |
| 6 | POST | `/ingestion-service/ingest/facilitySelection` | ingestion-service | 🔧 | FR-03 | Upload Project site-scope Excel (endpoint already exists) |
| 7 | POST | `/v1/field-plans/_create` / `_update` | field-planner | 🔧 | FR-04 | Create/update Installation Plan |
| 8 | POST | `/v1/activities/_assign-activity` | field-planner-activity | ♻️ | FR-04 | Assign Installation Reviewer (SPOC = Field Technician, confirmed; assigned via Vendor Assignment §4.9, not this endpoint) |
| 9 | POST | `/ingestion-service/template/fieldplanFacilityIngestionTemplate` | ingestion-service | 🔧 | FR-05 | Download Installation Scope Excel (Sheet 1) |
| 10 | POST | `/v1/field-plans/facility/bulk/_create` | field-planner | 🔧 | FR-05 | Bulk-assign Solution to sites |
| 11 | POST | `/ingestion-service/ingest/fieldPlanfacilitiesValidateData` + `/createFieldPlanFacility` | ingestion-service | 🔧 | FR-05 | Upload Installation Scope Excel (Sheet 1) — both endpoints already exist |
| 12 | POST | `/v1/field-plans/facility/_lock-check` | field-planner | 🆕 | FR-06 | Check End User Site lock status |
| 13 | POST | `/ingestion-service/template/vendorAssignmentTemplate` | ingestion-service | 🆕 | FR-07 | Download Vendor Assignment Excel (Sheet 2) |
| 14 | POST | `/ingestion-service/ingest/vendorAssignment` | ingestion-service | 🆕 | FR-07 | Upload Vendor Assignment Excel (Sheet 2) |
| 15 | POST | `/v1/bom/_create` / `_update` / `_search` | field-planner-activity | 🔧 | FR-07, FR-10 | Machine/Solar rows — endpoints already exist (`BOMApiController`), extend with `assetType`/`vendorOrgId` |
| 16 | POST | `/ingestion-service/template/installationTemplate` | ingestion-service | 🆕 | FR-08 | Download Installation Template Excel |
| 17 | POST | `/ingestion-service/ingest/installationTemplate` | ingestion-service | 🆕 | FR-08 | Upload Installation Template Excel |
| 18 | POST | `/v1/installation-templates/_create` / `_update` / `_search` | field-planner-activity | 🆕 | FR-08 | CRUD on Installation Templates |
| 19 | POST | `/v1/field-plans/{id}/_publish-validate` | field-planner | 🆕 | FR-09 | Pre-publish validation |
| 20 | POST | `/egov-wf/process/_transition` | egov-workflow-v2 | ♻️ | FR-09 | Publish Plan (new `INSTALLATION_PLAN` business service) |
| 21 | POST | `/v1/bom/otp/_send` | field-planner-activity | 🔧 | FR-11 | Thin wrapper over external `egov-otp` `_create` (client pattern already built in `amc-scheduler-service`) |
| 22 | POST | `/v1/bom/otp/_verify` | field-planner-activity | 🔧 | FR-11 | Thin wrapper over external `egov-otp` `_validate` |
| 23 | POST | `/filestore/v1/files` | egov-filestore | ♻️ | FR-11 | Upload photo/video evidence |
| 23b | — | (none — part of existing `/v1/bom/_update`) | field-planner-activity | ♻️ | FR-11 | Link evidence via existing `bom_document`/`documents[]`, no new endpoint |
| 24 | POST | `/v1/bom/_update` + `/egov-wf/process/_transition` (`SUBMIT_REPORT_A` then `SUBMIT_REPORT_B`) | field-planner-activity | 🔧 | FR-11, FR-12 | Field Technician's single in-app Submit — writes `bom.data`, fires both existing actions back-to-back |
| 25 | POST | `/v1/bom/_generate_pdf` / `_save_pdf` | field-planner-activity | ♻️ | FR-11 | Generate Handover Letter PDF — endpoints already exist |
| 26 | POST | `/v1/bom/section-review/_create` | field-planner-activity | 🆕 | FR-13 | Submit per-section Approve/Reject |
| 27 | POST | `/v1/asset/_create` / `_update` | asset-registry | ♻️ | FR-14 | Create/update handed-off Asset, extends existing `triggerInstallationCompletionSideEffects()` |
| 28 | POST | `/v1/audit-trail/_search` | field-planner-activity | 🆕 | FR-14 | Query audit trail |
| 29 | POST | `/v1/asset/_update` | asset-registry | ♻️ | §7.5 FR-13 (updated, asset-level) | Set existing `asset.is_operational = true` on the specific approved asset — same call as row #27, per-asset not per-site |
| 30 | POST | `/v1/asset/_search` | asset-registry | ♻️ | §7.5 FR-13 (updated, asset-level) | Check per-asset `asset.is_operational` — used by both the ticket-raising gate (im-services) and the WhatsApp chatbot's asset picker |
| 31 | POST | `/v2/request/_create` | im-services | 🔧 | §7.6 closing | Raise ticket (gated by eligibility) |
| 32 | (implied) POST | `/v1/field-plans/_search` + `/v1/bom/_search` + `/v1/field-plans/_update` | field-planner + field-planner-activity | ♻️ | §9 Notification Matrix | Scheduled Job 1 — "Planned Installation breached" weekly summary (no new controller) |
| 33 | (implied) POST | `/v1/field-plans/_search` + `/v1/bom/_search` + `/v1/field-plans/_update` + egov-hrms lookup | field-planner + field-planner-activity + egov-hrms | ♻️ | §9 Notification Matrix | Scheduled Job 2 — "<40% complete, 10 days prior" weekly summary (no new controller) |

---

## 3. Master Data, Vendor & Role Setup APIs

Cross-cutting APIs used throughout the flows below — solution lookup, vendor search, and role assignment aren't tied to one single actor step.

### 3.1 ♻️ Search Solution Repository — API #1
`POST /mdms-v2/v1/_search` — existing generic MDMS search. Query with `moduleName: "Installation"`, `masterName: "Solution"`, and filter by sector/sunshine-hours in the request `filter` — no code change, only a one-time schema registration for `Installation.Solution` (via MDMS's existing schema-definition API, not itemized separately here).

**DB Write:** No (read-only) — reads `eg_mdms_data` (`schemacode='Installation.Solution'`, JSONB `data` column).

**Request**
```json
{
  "MdmsCriteria": {
    "tenantId": "in",
    "moduleDetails": [
      {
        "moduleName": "Installation",
        "masterDetails": [
          { "name": "Solution", "filter": "[?(@.sector=='Agriculture' && @.sunshineHoursMin<=5.2 && @.sunshineHoursMax>=5.2)]" }
        ]
      }
    ]
  }
}
```
**Response**
```json
{
  "MdmsRes": {
    "Installation": {
      "Solution": [
        {
          "code": "SOL-PULVERIZER-001", "name": "Pulverizer", "sector": "Agriculture",
          "valueChain": "Post-harvest processing", "sunshineHoursMin": 4.5, "sunshineHoursMax": 6.0,
          "machineSpecs": { "type": "Pulverizer", "capacityRange": "5-10kg/hr" },
          "solarBundle": [ { "component": "Panel", "specDefault": "200W" } ]
        }
      ]
    }
  }
}
```

### 3.2 ♻️ Search / Create Vendor Organisation — API #2
`POST /organisation/v1/_search` (existing, vendor-registry) — filter by `orgSubType: "INSTALLATION_VENDOR"` + boundary/jurisdiction (State) during Vendor Assignment (FR-07) validation. No Asset Type filter — confirmed any vendor can be assigned to either Machine or Solar, so this dimension was dropped from an earlier draft of this doc.

**DB Write:** No (read-only) — reads vendor-registry's `eg_org`/`eg_org_jurisdiction`.

**Request**
```json
{
  "orgSearchCriteria": {
    "tenantId": "in",
    "orgType": "VENDOR",
    "orgSubType": "INSTALLATION_VENDOR",
    "jurisdiction": ["KA"]
  }
}
```
**Response**
```json
{
  "organisations": [
    { "id": "org-uuid-1", "name": "SunTech Installers Pvt Ltd", "orgType": "VENDOR", "orgSubType": "INSTALLATION_VENDOR",
      "orgPocEmail": "ops@suntech.example", "orgPocPhone": "9900011122", "isActive": true }
  ],
  "totalCount": 1
}
```

### 3.3 🔧 Assign `INSTALLATION_REVIEWER` / `FIELD_TECHNICIAN` role — API #3
`POST /employees/_create` or `/employees/_update` (existing, egov-hrms) — extend only by using the new role codes inside `assignments[].role`; no shape change.

**DB Write:** ✅ egov-hrms's own `eg_hrms_employee`/assignment tables (standard DIGIT service, not itemized further here — out of this feature's schema scope).

**Request**
```json
{
  "Employees": [
    {
      "tenantId": "in",
      "code": "EMP-2026-0451",
      "user": { "userName": "priya.reviewer", "mobileNumber": "9812345678" },
      "assignments": [
        { "isCurrentAssignment": true, "department": "Installation", "designation": "Reviewer",
          "roles": [ { "code": "INSTALLATION_REVIEWER", "tenantId": "in" } ] }
      ]
    }
  ]
}
```
**Response**
```json
{ "Employees": [ { "id": 4521, "uuid": "hrms-user-uuid", "code": "EMP-2026-0451" } ] }
```

---

## 4. Project Manager Flow

Mirrors `Livelihood_Installation_Flow_Diagrams.md` §1 (Project Manager flow) step-for-step: Project → Installation Plan → Solution assignment → Vendor assignment → Installation Template → Publish.

### 4.1 🔧 Create / Update Project — API #4 (Flow doc PM Step 1)
`POST /project/v1/_create` and `/project/v1/_update` (existing, `project` service). No new fields needed on the request/response models — both FR-02/FR-03 requirements already have a home:

- `additionalDetails.justificationCode` **already exists and is fully implemented** (`ProjectService.java`/`ProjectNameGenerationService.java`): format `JUS-XXXXX(-X)`, regex-validated, enforced read-only after creation, already used to build `project.name`. This is the same field FR-03's "enter Justification Code" maps to — reuse it as-is, don't add a parallel one. (Its existing `JUS-XXXXX` format is a longer reference-number style than the PRD's illustrative 2-letter example `"SD"` — that's fine, the PRD's example wasn't a strict format spec, and reusing the existing validated field is preferred over inventing a shorter parallel code.)
- `projectNumber` **already exists** as a distinct, mandatory, `egov-idgen`-backed column (config `egov.idgen.project.number.name=project.number`) — this doubles as FR-02's auto-generated Project ID, no new field.
- No `financialYear` input is needed — FR-03's Sub-step 1 doesn't ask the Project Manager to enter one; it's derived at ID-generation time (the same way `egov-idgen`'s `[fy:...]` placeholder derives financial year from the current date elsewhere in this platform).

**Known gap** (an ID-generation-logic gap, not a schema one): `egov-idgen`'s format placeholders can't splice in a caller-supplied value like `justificationCode`, and its sequence counters aren't partitioned per arbitrary key — so FR-02's "sequence resets per Justification Code + Financial Year" needs the same application-code composition pattern `ProjectNameGenerationService` already uses for `project.name` (call idgen for the sequence/FY portion, prepend `justificationCode` in code), not a pure idgen format string.

**DB Write:** ✅ `project` (`name`, `projectNumber`, `additionalDetails.justificationCode`) — all confirmed existing columns (`V20221202180100__project_create_ddl.sql` + `V20230213144100__project_column_add_ddl.sql`), written asynchronously via Kafka topic `save-project`.

**Request**
```json
{
  "Projects": [
    {
      "tenantId": "in",
      "name": "Karnataka Agri Livelihood Q3 2026",
      "startDate": 1721606400000,
      "endDate": 1729382400000,
      "additionalDetails": {
        "justificationCode": "JUS-00120",
        "geography": { "states": ["KA"], "districts": ["Tumkur"], "blocks": [] }
      }
    }
  ]
}
```
**Response**
```json
{
  "Project": [
    {
      "id": "proj-uuid-1",
      "projectNumber": "PROJ-00120-2627-001",
      "additionalDetails": { "justificationCode": "JUS-00120" },
      "auditDetails": { "createdTime": 1721654400000 }
    }
  ]
}
```
*(`projectNumber` is populated server-side on create — `egov-idgen` supplies the financial-year + sequence portion, application code prepends the `justificationCode` numeric part, mirroring how `project.name` is already composed today.)*

**Draft persistence**: no new mechanism needed — `ProjectValidator.validateProjectRequest` only mandates `tenantId`, so `ProjectService.createProject` persists a real `project` row immediately at Sub-step 1 (name, justification code, dates); the frontend re-enters the same in-progress project via `?projectId=...&key=...` on later steps instead of re-creating it. There's no literal `DRAFT` status value — `ProjectService.isDraftProject()` treats a `null` status as "Draft."

### 4.2 🔧 Download End User Site Selection Template — API #5 (Flow doc PM Step 2)
`POST /ingestion-service/template/facilitySelection` (existing, `ingestion-service`) — already takes `parent_project_id` + `boundary_codes`; extend to also emit the `lock_status` read-only column so the FE can show already-locked sites even before Plan creation.

**DB Write:** No (read-only) — reads `facility`, `facility_address` (health-facility-registry).

**Request** (multipart form)
```
parent_project_id: proj-uuid-1
boundary_codes: KA.TUMKUR.SIRA
request_info: {"apiId":"installation-app", "authToken":"..."}
```
**Response**: `.xlsx` file stream (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), columns: `Site Name (readonly), Village, State, District, Block, Sector, Include (Yes/No)`.

### 4.3 🔧 Upload Project Facility Scope — API #6 (Flow doc PM Step 3)
`POST /ingestion-service/ingest/facilitySelection` — **this endpoint already exists** (`upload_facility_selection_excel_sheet` in `app/api/endpoints/file_ingestion.py`), pairing with the existing `facilitySelection` download (§4.2). It already reads the sheet and calls `project` service's `create_project_facility()` per row — likely needs only a schema/column check (e.g. confirming the MDMS `data-ingestion.FacilitySelectionSchema` covers the geography/Include validation FR-03 needs), not new code.

**DB Write:** ✅ `PROJECT_FACILITY` (`projectId`, `facilityId`) — confirmed columns (`V20230224122200__project_facility_ddl.sql`), one row per **included** site, written asynchronously via Kafka topic `save-project-facility-topic`. There is no `include` column — a site marked "Include = No" simply never gets a row here (row presence *is* the Include flag, per LLD §3.1).

**Request** (multipart form)
```
project_id: proj-uuid-1
facility_selection_file: <Sheet0-Completed.xlsx>
request_info: {...}
```
**Response**: the uploaded `.xlsx` returned as-is with `status`/`error` columns filled in per row (e.g. row 14 might get `status=FAILED`, `error="Include marked Yes but row is outside selected geography"`) — see §1's `ingestion-service` conventions note. No JSON error body.

### 4.4 🔧 Create / Update Installation Plan — API #7 (Flow doc PM Step 4, call 1)
`POST /v1/field-plans/_create` and `_update` (existing, `field-planner`) — extend `FieldPlan` request model with `sectors[]`, `seniorContactName/Email/Phone`, and a new `uuid` field (technical identifier only). No separate `planNumber` field: `id` itself becomes the human-readable Plan ID — its generation switches from a random UUID to `IdGenService` (the same mechanism its own sibling entity, `FieldPlanFacility`, already uses), rather than adding a parallel field. No new status field either — the existing `status` field (already on `FieldPlan`, default `ACTIVE`) is reused for the Draft/Published lifecycle instead.

**DB Write:** ✅/🆕 mixed — `field_plans` table exists (`V20250901180100__fieldPlanner_create_ddl.sql`: `id`, `project_id`, `geography_scope`, `status` all ✅), written asynchronously via Kafka topic `save-field-plan`. But **`sectors`, `senior_contact_name/email/phone`, `published_time`, `installation_breach_last_notified_time`, `low_completion_last_notified_time` are all 🆕** — a repo-wide search across every `field-planner` migration found zero matches for any of them, so today's `_create` call has nowhere to persist the request's `sectors`/`additionalDetails.seniorContact*` fields until those `ALTER TABLE`s land.

**Request**
```json
{
  "FieldPlans": [
    {
      "tenantId": "in",
      "name": "Sira Block Installation Plan 1",
      "projectId": "proj-uuid-1",
      "geographyScope": { "districts": ["Tumkur"], "blocks": ["Sira"] },
      "sectors": ["Agriculture"],
      "startDate": 1721606400000,
      "endDate": 1724198400000,
      "additionalDetails": {
        "seniorContactName": "Ravi Kumar", "seniorContactEmail": "ravi.kumar@selco.example", "seniorContactPhone": "9900012345"
      }
    }
  ]
}
```
**Response**
```json
{ "FieldPlan": [ { "id": "IP-2026-001", "uuid": "8f2c1e40-...-internal", "status": "DRAFT" } ] }
```

**Draft persistence**: same principle as §4.1 — `FieldPlannerEnrichment.enrichFieldPlanOnCreate` sets `status = DRAFT_STATUS` on `_create`, so the row exists as soon as the first wizard step is submitted, before Scope Excel (§4.6), Vendor Assignment Excel (§4.8), or Installation Template Excel (§4.10) round-trips happen.

### 4.5 ♻️ Assign Installation Reviewer — API #8 (Flow doc PM Step 4, call 2)
`POST /v1/activities/_assign-activity` (existing, `field-planner-activity`) against the pre-seeded `INS` activity — no change. The `INS` activity's other pre-seeded role, `INSTALLATION_SPOC`, is **not** assigned through this endpoint: it's confirmed to name the Field Technician, whose assignment is inherently per-vendor-per-facility (via `bom.vendorOrgId`/`eg_org_user`, §4.9) rather than a single plan-level assignee the way the Reviewer is — see LLD §3.2.

**DB Write:** ✅ `activity_assignments` (`field_plan_id`, `activity_id`, `assigned_to`, `role`, `poc_number`) — all confirmed columns, including `role` (JSONB, added by `V20250929180100`) and `poc_number` (added by `V20251002180100`) — written asynchronously via Kafka topic `save-activity-assignment-topic`.

**Request**
```json
{
  "ActivityAssignments": [
    { "tenantId": "in", "fieldPlanId": "IP-2026-001", "activityId": "activity-ins-uuid",
      "assignedTo": "hrms-reviewer-uuid", "role": { "code": "INSTALLATION_REVIEWER" }, "pocNumber": "9900012399" }
  ]
}
```
**Response**
```json
{ "ActivityAssignment": [ { "id": "assign-uuid-1", "status": "ACTIVE" } ] }
```

### 4.6 🔧 Download Installation Scope Template (Sheet 1) — API #9 (Flow doc PM Step 5)
`POST /ingestion-service/template/fieldplanFacilityIngestionTemplate` (existing) — extend to pre-filter the Solution dropdown per FR-01 (sector + sunshine-hours already known per row) and mark `lock_status` read-only column.

**DB Write:** No (read-only) — reads `field_plan_facilities`, `facility`.

**Request** (multipart form)
```
field_plan_id: IP-2026-001
request_info: {...}
```
**Response**: `.xlsx`, columns: `Site Name (readonly), Village, State, District, Block, Sector (readonly), Include (Yes/No), Solution (dropdown, filtered), Lock Status (readonly)`.

### 4.7 🔧 Upload Installation Scope (Sheet 1) — API #11, #10, #12 (Flow doc PM Step 6)
**Two existing endpoints already implement this pattern for plain facility-to-plan linking** — `POST /ingestion-service/ingest/fieldPlanfacilitiesValidateData` (validation only, calls `project_facility_validation(..., 'data-ingestion.FieldPlanFacilityIngestionSchema')`) followed by `POST /ingestion-service/ingest/createFieldPlanFacility` (actual create/link/unlink, via `FieldPlanServiceClient.create_fieldPlan_facility_bulk`/`unlink_fieldplan_facility`). Extending them for FR-05/FR-06 means: adding a `Solution` column to the `FieldPlanFacilityIngestionSchema` MDMS schema (validated against FR-01's per-site filtered dropdown) and adding the FR-06 lock check into `createFieldPlanFacility`'s row loop (calling the Lock Check API below) before it links each site — not new endpoints. This step also internally calls:
- `POST /v1/field-plans/facility/bulk/_create` — **API #10** — the actual bulk write (below)
- `POST /v1/field-plans/facility/_lock-check` — **API #12**, 🆕 — a lightweight synchronous pre-check the frontend can call before an Excel upload for faster feedback

**DB Write:** ✅/🆕 mixed — `field_plan_facilities` base link (`field_plan_id`, `facility_id`) exists (`V20250901180100`, three columns later renamed to lowercase by `V20250924180100`: `is_deleted→isdeleted`, `last_modified_time→lastmodifiedtime`, `tenant_id→tenantid`). But **`solution_id` and `lock_status` — the two columns FR-05/FR-06 actually need — are 🆕**, not present in any migration found in this repo; without them this call can persist the plan↔site link but not the Solution assignment or lock state. `facility_activities` (activity=`INS`) is also created per included site — table exists ✅ (`V20250901180100`), write path not individually verified in code but architecturally consistent with every other confirmed `field-planner-activity` write. Written asynchronously via Kafka topic `save-fieldplan-facility-topic`.

**Request** (multipart form, validate step)
```
field_plan_id: IP-2026-001
scope_file: <Sheet1-Completed.xlsx>
request_info: {...}
```
**Response**: the uploaded `.xlsx` returned with `status`/`error` columns filled in — e.g. a locked site gets `error="End User Site \"ABC Farmer Group\" is currently undergoing installation under Installation Plan \"IP-2026-001\". The site can be included in another Installation Plan only after all installation reports are approved."` (only once validation passes does the Project Manager proceed to the create/link call).

**Request** (bulk create, API #10)
```json
{
  "FieldPlanFacilities": [
    { "tenantId": "in", "fieldPlanId": "IP-2026-001", "facilityId": "site-uuid-42", "solutionId": "SOL-PULVERIZER-001" }
  ]
}
```
**Response**: `202 Accepted` (async, existing Kafka-backed pattern) — `{ "ResponseInfo": { "status": "successful" } }`

**Request** (lock check, API #12)
```json
{ "tenantId": "in", "facilityIds": ["site-uuid-42", "site-uuid-58"] }
```
**Response**
```json
{
  "lockStatuses": [
    { "facilityId": "site-uuid-42", "locked": false },
    { "facilityId": "site-uuid-58", "locked": true, "lockingPlanId": "plan-uuid-9", "lockingPlanNumber": "IP-2026-004" }
  ]
}
```

**Post-Publish Scope Edits** (PRD p.9): once `field_plans.status = 'PUBLISHED'`, edits to `field_plan_facilities` are asymmetric. `include = true → false` (removing a site) is allowed at any time — unless a `bom` row already exists for that site's `facility_activity`, in which case the edit is rejected. `include = false → true` (adding a new site) is **never** allowed on a Published Plan — a new Plan is needed instead. Both directions still go through the same Sheet 1 Excel.

### 4.8 🆕 Download Vendor Assignment Template (Sheet 2) — API #13 (Flow doc PM Step 7)
`POST /ingestion-service/template/vendorAssignmentTemplate` — new; server expands each included site's Solution into a Machine row + a Solar row before emitting the sheet.

**DB Write:** No (read-only) — reads `bom` rows (auto-created blank per `facility_activity` × `asset_type`, Machine + Solar).

**Request** (multipart form)
```
field_plan_id: IP-2026-001
request_info: {...}
```
**Response**: `.xlsx`, columns: `Site Name (readonly), Village, State, Solution (readonly), Asset Type (readonly: Machine/Solar), Vendor Organisation (dropdown, filtered by State only — confirmed any vendor can be assigned to either Asset Type), Vendor Email (dropdown)`.

### 4.9 Vendor Assignment (Sheet 2) + BOM CRUD — API #14, #15 (Flow doc PM Step 8)

**🆕 Upload Vendor Assignment**: `POST /ingestion-service/ingest/vendorAssignment` — new endpoint. `ingestion-service` has no existing client for `field-planner-activity`/`bom` at all (its existing clients target `project`, `facility`, `asset-registry`), so a new one is needed regardless of the `bom`-reuse correction elsewhere in this doc. Still reuses the generic scaffolding: register a new `data-ingestion.VendorAssignmentSchema` MDMS schema and call the existing `validate_columns()`/`validate_row_constraints()` (§1 conventions) for validation, and reuse `ExcelDataWriter` for writing `status`/`error` back into the sheet. Internally calls `POST /v1/bom/_update` per row (row-by-row, since existing clients like `AssetServiceClient` are one-row-at-a-time, not bulk).

**🔧 Create / Update / Search BOM (Machine/Solar asset rows)**: `POST /v1/bom/_create`, `_update`, `_search` — **these endpoints already exist** (`BOMApiController`, `field-planner-activity`). No new controller needed — extend the `BillOfMaterial` request model with `assetType`, `solutionId`, `vendorOrgId`, `vendorEmail` (§3.3's LLD correction: `installation_asset` was folded into `bom`, not a parallel new table). Two rows are created per facility (Machine + Solar), relying on `bom`'s existing lack of a uniqueness constraint on `activityFacilityId` — tightened by a new `UNIQUE(activity_facility_id, asset_type)` constraint. `_search` doubles as the Field Technician's task inbox (§5.1) filtered by `vendorOrgId`.

**DB Write:** ✅/🆕 mixed — `bom` base columns (`id`, `activity_facility_id`, `assign_user`, `data`) exist (`V20250919180100__bom_create_ddl.sql`, `activity_facility_id` added by `V20251017141800`). But **`asset_type`, `solution_id`, `vendor_org_id`, `vendor_email`, `otp_uuid` are all 🆕** — a repo-wide search for `vendor_org_id`/`otp_uuid` returns zero hits in any `field-planner-activity` migration. So today, `_create` can persist the base BOM row, but the Vendor Assignment upload's `vendorOrgId`/`vendorEmail` (and `assetType`/`solutionId`) have nowhere to write until that `ALTER TABLE bom ADD COLUMN ...` (LLD §3.3) lands. Written asynchronously via Kafka topic `update-bom-topic` (confirmed: `BomService.java:197`, no JDBC write anywhere in `BomRepository.java`).

**Request** (upload, multipart form)
```
field_plan_id: IP-2026-001
vendor_assignment_file: <Sheet2-Completed.xlsx>
request_info: {...}
```
**Response**: the uploaded `.xlsx` returned with `status`/`error` columns filled in per row — e.g. a row assigning a vendor not jurisdiction-eligible for that state gets `status=failed`, `error="Vendor not eligible for state=KA"`.

**Create request** (BOM)
```json
{
  "BillOfMaterials": [
    { "tenantId": "in", "activityFacilityId": "fac-act-uuid-42", "assetType": "MACHINE", "solutionId": "SOL-PULVERIZER-001",
      "assignUser": "hrms-technician-uuid", "vendorOrgId": "org-uuid-1", "vendorEmail": "ops@suntech.example", "name": "Pulverizer BOM" },
    { "tenantId": "in", "activityFacilityId": "fac-act-uuid-42", "assetType": "SOLAR", "solutionId": "SOL-PULVERIZER-001",
      "assignUser": "hrms-technician-uuid", "vendorOrgId": "org-uuid-2", "vendorEmail": "ops@brightsolar.example", "name": "Pulverizer Solar BOM" }
  ]
}
```
**Search request** (Field Technician task inbox, reused in §5.1)
```json
{ "criteria": { "tenantId": "in", "vendorOrgId": "org-uuid-1" } }
```
**Search response**
```json
{
  "BillOfMaterial": [
    { "id": "bom-uuid-1", "activityFacilityId": "fac-act-uuid-42", "assetType": "MACHINE", "vendorOrgId": "org-uuid-1", "data": {} }
  ],
  "totalCount": 1
}
```

### 4.10 🆕 Download Installation Template — API #16 (Flow doc PM Step 9)
`POST /ingestion-service/template/installationTemplate` — new; one blank (prepopulated, per LLD §3.3) template per unique Solution in the Plan.

**DB Write:** No (read-only) — reads `egov-mdms-service-v2`'s `eg_mdms_data` (`Installation.Solution.associatedMachines`/`solarBundle` defaults) and `field_plan_facilities` (read-only site reference columns: Site Name, Pincode, State/District/Block).

**Request** (multipart form)
```
field_plan_id: IP-2026-001
solution_code: SOL-PULVERIZER-001
request_info: {...}
```
**Response**: `.xlsx`, sections "Machine" and "Solar", columns per FR-08: `Installation Component, Quantity, Make, Model, Capacity, Technical Specifications`.

### 4.11 Upload Installation Template + CRUD — API #17, #18 (Flow doc PM Step 10)

**🆕 Upload**: `POST /ingestion-service/ingest/installationTemplate` — new endpoint, same reasoning as §4.9's vendor-assignment upload: register a `data-ingestion.InstallationTemplateSchema` MDMS schema so the generic validation machinery handles it unchanged; only the new client call into the create/update below is genuinely new code.

**🆕 Create / Update / Search Installation Template**: `POST /v1/installation-templates/_create`, `_update`, `_search` — new, `field-planner-activity`.

**DB Write:** 🆕 the entire `installation_template` table — confirmed absent from the codebase (zero controller, service, repository, model, or DB migration referencing `installation_template`/`InstallationTemplate` anywhere; `field-planner-activity`'s only controllers today are `HealthApiController`, `ActivityApiController`, `BOMApiController`). Per LLD §3.3, once built: `id, tenant_id, field_plan_id, solution_id, machine_section (JSONB), solar_section (JSONB), tender_number`, unique on `(field_plan_id, solution_id)`.

**Request** (upload, multipart form)
```
field_plan_id: IP-2026-001
solution_code: SOL-PULVERIZER-001
template_file: <InstallationTemplate-Completed.xlsx>
request_info: {...}
```
**Response**: the uploaded `.xlsx` returned with `status`/`error` columns filled in — e.g. a missing required capacity field gets `status=FAILED`, `error="Capacity is required for row 3 (Motor)"`.

**Request** (create)
```json
{
  "InstallationTemplates": [
    {
      "tenantId": "in", "fieldPlanId": "IP-2026-001", "solutionId": "SOL-PULVERIZER-001",
      "machineSection": { "components": [ { "name": "Motor", "quantity": 1, "make": "Crompton", "model": "CG-5HP", "capacity": "5HP" } ] },
      "solarSection": { "components": [ { "name": "Panel", "quantity": 4, "make": "Waaree", "model": "WS-200", "capacity": "200W" } ] }
    }
  ]
}
```
**Response**
```json
{ "InstallationTemplate": [ { "id": "tmpl-uuid-1" } ] }
```

### 4.12 🆕 Publish Validation Check — API #19 (Flow doc PM Step 11)
`POST /v1/field-plans/{id}/_publish-validate` — new; runs the FR-09 checklist (every included site has a Solution, every expanded asset row has a Vendor + Vendor Email, every unique Solution has a filled Installation Template) without mutating state.

**DB Write:** No (read-only) — reads across `field_plans`, `field_plan_facilities`, `bom`, `installation_template`.

**Request**: `POST /v1/field-plans/IP-2026-001/_publish-validate` (empty body besides RequestInfo)

**Response (passes)**
```json
{ "valid": true, "errors": [] }
```
**Response (fails)**
```json
{
  "valid": false,
  "errors": [
    { "type": "MISSING_VENDOR", "siteName": "Doddaballapur SHG", "assetType": "SOLAR" },
    { "type": "MISSING_TEMPLATE", "solutionCode": "SOL-GRINDER-002" }
  ]
}
```

### 4.13 ♻️ Workflow Transition — Publish — API #20 (Flow doc PM Step 12)
`POST /egov-wf/process/_transition` (existing, `egov-workflow-v2`) — no code change; only a new `INSTALLATION_PLAN` business-service config (states `DRAFT --PUBLISH--> PUBLISHED`) needs registering once via the workflow service's existing config-load mechanism.

**DB Write:** ✅/🆕 mixed — the workflow engine's own `eg_wf_processinstance_v2` transition row is ✅ fully confirmed (`StatusUpdateService.java:35-48` → topic `save-wf-transitions` → `egov-workflow-v2-persister.yml:6`, clean persister pairing). But the corresponding `field_plans.status='PUBLISHED'` update is ✅ (repurposed existing column) while `field_plans.published_time` is 🆕 (not yet migrated) — both would go via the confirmed `update-fieldplan` Kafka topic (`FieldPlannerService.java:517`).

**Request**
```json
{
  "ProcessInstances": [
    { "tenantId": "in", "businessService": "INSTALLATION_PLAN", "businessId": "IP-2026-001",
      "action": "PUBLISH", "comment": "All checks passed, dispatching to vendors" }
  ]
}
```
**Response**
```json
{ "ProcessInstances": [ { "id": "pi-uuid-1", "state": { "state": "PUBLISHED" }, "businessId": "IP-2026-001" } ] }
```

### 4.14 (system) Publish notification to Vendors — Flow doc PM Step 13
Internal side effect of §4.13's `PUBLISH` transition — not a separately itemized API. Once `field_plans.status = 'PUBLISHED'` and tasks are dispatched, `field-planner` reads the Plan's `bom` rows (already vendor-assigned via §4.9) from `field-planner-activity`, de-duplicates by `vendor_email`, and emails each distinct vendor once via `im-services`' `LivelihoodEmailNotificationService` — confirmed requirement (LLD §3.9 row 5), same delivery mechanism as §5.7/§8.

**DB Write:** No new table — reads `bom.vendor_email` only. Email delivery itself is Kafka-topic-based (`email-send-consumer`), per `im-services`.

**Sample Kafka message** (illustrative — published by `im-services`, one per distinct vendor)
```json
{
  "topic": "email-send-consumer",
  "value": {
    "tenantId": "in",
    "emailType": "INSTALLATION_PLAN_PUBLISHED",
    "recipientEmail": "ops@suntech.example",
    "templateParams": { "planId": "IP-2026-001", "planName": "Sira Block Installation Plan 1" }
  }
}
```

---

## 5. Field Technician Task & IC Report Flow

Mirrors `Livelihood_Installation_Flow_Diagrams.md` §2 (Field Technician flow). **Runs once per `bom` row** — Machine and Solar progress independently.

### 5.1 🔧 Search BOM — Task Inbox — API #15 (Flow doc FT Step 1)
Same endpoint as §4.9 `_search` — filter by `vendorOrgId` (resolved from the logged-in Field Technician's `eg_org_user` link). No separate endpoint.

**DB Write:** No (read-only) — reads `bom` filtered by `vendorOrgId`.

**Request**
```json
{ "criteria": { "tenantId": "in", "vendorOrgId": "org-uuid-1" } }
```
**Response**
```json
{
  "BillOfMaterial": [
    { "id": "bom-uuid-1", "activityFacilityId": "fac-act-uuid-42", "assetType": "MACHINE", "vendorOrgId": "org-uuid-1", "data": {} }
  ],
  "totalCount": 1
}
```

*(Flow doc FT Steps 2–7 — reviewing pre-filled template data, performing the physical installation, filling the IC Report form and capturing photos/video on-device, and offline save/Sync — either read existing data or happen entirely client-side with no server call, so there is no additional API entry for them here; see the Flow Diagrams doc for that detail.)*

### 5.2 🔧 Send OTP — API #21 (Flow doc FT Step 8)
`POST /v1/bom/otp/_send` — new route on the existing `BOMApiController`, but **not new logic**: it's a thin wrapper that calls the external `egov-otp` service's `POST /otp/v1/_create` (host/paths already configured elsewhere in this platform — `egov.otp.host`, `egov.otp.create.url` — and a working client already exists in `amc-scheduler-service`'s `ScheduledVisitService.createOTP()` to copy the pattern from). Stores only the returned `uuid` in `bom.otp_uuid`, then delivers the returned `otp` code via the existing `egov-notification-sms` SMS mechanism — no hash/expiry is computed or stored by `field-planner-activity` itself.

**DB Write:** 🆕 `bom.otp_uuid` — column and endpoint both confirmed absent from the codebase (`BOMApiController.java` has no `_send`/`_verify` methods today; repo-wide search for `otp_uuid` returns zero hits). Once built, would most naturally reuse the same confirmed `update-bom-topic` Kafka producer every other `bom` field update already uses.

**Request**
```json
{ "tenantId": "in", "bomId": "bom-uuid-1", "endUserMobileNumber": "9876543210" }
```
**egov-otp `_create` call** (internal, for reference)
```json
{ "otp": { "tenantId": "in", "identity": "9876543210" } }
```
**Response**
```json
{ "otpUuid": "b3f1c2d4-...-otp-ref" }
```

### 5.3 🔧 Verify OTP — API #22 (Flow doc FT Step 9)
`POST /v1/bom/otp/_verify` — new route, same wrapper pattern: calls `egov-otp`'s `POST /otp/v1/_validate` with `bom.otp_uuid` and the entered code, and returns its `isValidationSuccessful` result directly. No local hash/expiry comparison — `egov-otp` is the source of truth.

**DB Write:** No — no local `otp_verified` flag is stored; a successful verify is used immediately as the gate for §5.5's `SUBMIT_REPORT_A` transition, and that workflow transition having occurred is itself the durable record.

**Request**
```json
{ "tenantId": "in", "bomId": "bom-uuid-1", "otp": "482913" }
```
**egov-otp `_validate` call** (internal, for reference)
```json
{ "otp": { "tenantId": "in", "identity": "9876543210", "uuid": "b3f1c2d4-...-otp-ref", "otp": "482913" } }
```
**Response (success)**
```json
{ "otpVerified": true }
```
**Response (mismatch/expired — as returned by `egov-otp`)**
```json
{ "otpVerified": false }
```

### 5.4 Upload & Link Photo/Video Evidence — API #23, #23b (Flow doc FT Step 10, part 1)
**♻️ Upload**: `POST /filestore/v1/files` (standard DIGIT `egov-filestore` convention — assumed present in this deployment as-is; not independently verified in this repo scan, flagged for confirmation).

**♻️ Link**: no separate endpoint — `bom_document` already exists and `BillOfMaterial.documents[]` is already part of the existing `POST /v1/bom/_update` request payload (§4.9). Photos/video are attached the same way any other BOM document already is, with `documentType` values `PHOTO`/`VIDEO` (new value convention, not new schema).

**DB Write:** ✅ `bom_document` (`bomid`, `documenttype`, `filestoreid`) — confirmed columns (`V20250924180100__bom_document_create_ddl.sql`). **Note: the real physical column names are lowercase/no-underscore** (`bomid`, `documenttype`, `filestoreid`), unlike the request JSON's camelCase (`bomId`, `documentType`, `fileStoreId`).

**Request** (upload, multipart)
```
file: panel_install.jpg
tenantId: in
module: installation
```
**Response** (upload)
```json
{ "files": [ { "id": "doc-uuid-1", "fileStoreId": "fs-uuid-1", "fileName": "panel_install.jpg" } ] }
```
**Request** (link, `_update` extract)
```json
{
  "BillOfMaterials": [
    { "id": "bom-uuid-1", "tenantId": "in",
      "documents": [ { "documentType": "PHOTO", "fileStoreId": "fs-uuid-1" } ] }
  ]
}
```

### 5.5 🔧 Submit IC Report (Field Technician, in-app — one actor, one submission) — API #24 (Flow doc FT Step 10, part 2)
Two calls, both against existing endpoints, fired together as the technician's single "Submit" action:

1. `POST /v1/bom/_update` (existing, §4.9) — writes the confirmed/edited machine/solar spec fields and the entered System Functionality Parameters into `bom.data`, alongside the photo/video/OTP state already on the row (§5.2–5.4).
2. `POST /egov-wf/process/_transition` (existing `FACILITY_INSTALLATION` business service, same endpoint as §6.3) — called **twice in immediate succession**, `action: "SUBMIT_REPORT_A"` then `action: "SUBMIT_REPORT_B"`, both against the same `bom.id`. There's no separate Project Manager/supervisor actor in this design (LLD §3.3's role mapping), so the technician's app triggers both transitions back-to-back rather than waiting on a second person.

**DB Write:** ✅ `bom.data` (real column, real write today) + ✅ `eg_wf_processinstance_v2` (2 transitions, confirmed via `StatusUpdateService.java:48` → topic `save-wf-transitions`). This is one of the parts of the design that already works end-to-end in the current codebase.

**Request** (`_update`, extract)
```json
{
  "BillOfMaterials": [
    { "id": "bom-uuid-1", "tenantId": "in",
      "data": { "components": [ { "name": "Motor", "quantity": 1, "make": "Crompton", "model": "CG-5HP", "installedCapacity": "5HP" } ],
                "systemFunctionalityParameters": { "arraySizeKwp": 5.2, "noOfModules": 20 } } }
  ]
}
```
**Request** (`_transition`, called twice — `action` is the only field that changes between the two calls)
```json
{
  "ProcessInstances": [
    { "tenantId": "in", "businessService": "FACILITY_INSTALLATION", "businessId": "bom-uuid-1", "action": "SUBMIT_REPORT_A" }
  ]
}
```
**Response** (final, after both transitions)
```json
{ "ProcessInstances": [ { "id": "pi-uuid-3", "state": { "state": "SUBMITTED_BY_SUPERVISOR" }, "businessId": "bom-uuid-1" } ] }
```
*(`SUBMITTED_BY_SUPERVISOR` is the real state name `frontend/installation-ui` already searches for to populate the Reviewer's queue, confirmed from `Activity.js`; the intermediate state between the two actions is not itemized in any checked-in config — confirm against the live `FACILITY_INSTALLATION` workflow config before implementation.)*

### 5.6 ♻️ Generate Handover Letter PDF — API #25
`POST /v1/bom/_generate_pdf` (returns raw PDF) and `POST /v1/bom/_save_pdf` — **these already exist** (`BOMApiController`, same integration used for BOM's own PDF today). No new endpoint: the Handover Letter is just a different `GenerateBOMPdfRequest.system` template key against the same `bom` row, once `bom.data` has been populated by §5.5. Per the PRD's "generated from image" requirement (LLD §3.3): the mechanism is embedding — one of the technician's already-uploaded photos (§5.4) is placed into the generated PDF alongside the existing Handover Letter fields, the same way `egov-pdf-service`'s existing templates already support an image placeholder — no OCR or separate image-processing step.

**DB Write:** ✅ `bom_document` row with `documenttype = 'HANDOVER_LETTER'` — same existing mechanism `BomService` already uses for its own PDF output, just a new `documenttype` value.

**Request**
```json
{ "tenantId": "in", "system": "HANDOVER_LETTER", "bom": { "id": "bom-uuid-1" }, "imageFileStoreId": "fs-uuid-1" }
```
**Response** (`_save_pdf`)
```json
{ "filestoreId": "fs-uuid-handover-1" }
```

### 5.7 (system) IC Report submission notification — Flow doc FT Step 11
Internal side effect of §5.5's `SUBMIT_REPORT_B` transition — not separately itemized as its own controller. Two new Email notifications fire at this moment (LLD §3.9 rows 1–2), via `im-services`' `LivelihoodEmailNotificationService`:

- **Assigned Installation Reviewer for the Plan** — resolved via `activity_assignments` (role `INSTALLATION_REVIEWER`, §4.5) → HRMS email lookup.
- **Vendor** — direct read of `bom.vendor_email` (§4.9) — already captured at Vendor Assignment, no lookup needed.

**DB Write:** No new table — reads `activity_assignments` and `bom.vendor_email`; delivery is Kafka-topic-based (`email-send-consumer`).

**Sample Kafka message** (illustrative)
```json
{
  "topic": "email-send-consumer",
  "value": {
    "tenantId": "in",
    "emailType": "IC_REPORT_SUBMITTED",
    "recipientEmail": "priya.reviewer@selco.example",
    "templateParams": { "bomId": "bom-uuid-1", "siteName": "ABC Farmer Group", "assetType": "MACHINE" }
  }
}
```

---

## 6. Installation Reviewer Flow

Mirrors `Livelihood_Installation_Flow_Diagrams.md` §3 (Installation Reviewer flow). **Runs once per `bom` row** — Machine and Solar reports for a site are reviewed as separate queue entries.

### 6.1 🔧 Search BOM — Review Queue — API #15 (Flow doc Reviewer Steps 1–2)
Same endpoint as §4.9 `_search`, filtered to `fieldPlanIds` the logged-in Installation Reviewer is assigned to (resolved via §4.5's `activity_assignments`) and to the workflow state the existing frontend already searches for pending review (`SUBMITTED_BY_SUPERVISOR`). No separate endpoint. Opening one row's full report (§4.9's model plus `bom_document`) reuses the same `_search`, filtered by `id`.

**DB Write:** No (read-only) — reads `bom`, `bom_document`, `activity_assignments`, `eg_wf_processinstance_v2`.

**Request** (queue, scoped by assigned Plans + workflow state)
```json
{ "criteria": { "tenantId": "in", "fieldPlanIds": ["IP-2026-001"], "wfState": "SUBMITTED_BY_SUPERVISOR" } }
```
**Response**
```json
{
  "BillOfMaterial": [
    { "id": "bom-uuid-1", "activityFacilityId": "fac-act-uuid-42", "assetType": "MACHINE", "vendorOrgId": "org-uuid-1" }
  ],
  "totalCount": 1
}
```

### 6.2 🆕 Submit Section Review — API #26 (Flow doc Reviewer Step 3)
`POST /v1/bom/section-review/_create` — new, `field-planner-activity`. Writes one `bom_section_review` row per section — the one piece of review granularity that doesn't already exist (the live workflow's `APPROVE`/`REJECT_AND_ASSIGN_FOR_FIELD_QC` actions are whole-report, no per-section reason). Internally triggers §6.3's workflow transition once all sections for a `bom` row are marked.

**DB Write:** 🆕 the entire `bom_section_review` table — confirmed absent from the codebase (zero references to `SectionReview`/`section-review`/`bom_section_review` anywhere). Per LLD §3.3, once built: `id, tenant_id, bom_id, section_name, decision, reason, reviewed_by, reviewed_time`.

**Request**
```json
{
  "BomSectionReviews": [
    { "tenantId": "in", "bomId": "bom-uuid-1", "sectionName": "SPECS", "decision": "APPROVE" },
    { "tenantId": "in", "bomId": "bom-uuid-1", "sectionName": "PHOTOS", "decision": "REJECT", "reason": "Panel photo is blurry, retake in daylight" },
    { "tenantId": "in", "bomId": "bom-uuid-1", "sectionName": "VIDEO", "decision": "APPROVE" },
    { "tenantId": "in", "bomId": "bom-uuid-1", "sectionName": "HANDOVER_LETTER", "decision": "APPROVE" }
  ]
}
```
**Response**
```json
{ "BomSectionReview": [ { "id": "rev-1" }, { "id": "rev-2" }, { "id": "rev-3" }, { "id": "rev-4" } ], "workflowActionTriggered": "REJECT_AND_ASSIGN_FOR_FIELD_QC" }
```

### 6.3 ♻️ Workflow Transition — Approve/Reject — API #20 (Flow doc Reviewer Steps 4A/4B)
`POST /egov-wf/process/_transition` (existing, `egov-workflow-v2`) — same endpoint as §4.13 and §5.5, different action. **No new business-service config needed**: `FACILITY_INSTALLATION` already exists and is already live (LLD §3.3) — this reuses its real actions `APPROVE`/`REJECT_AND_ASSIGN_FOR_FIELD_QC`/`FLAG_FOR_QC`, not an invented `IC_REPORT` business service.

**DB Write:** ✅ `eg_wf_processinstance_v2` transition — confirmed via the same `StatusUpdateService.java:48` → `save-wf-transitions` path as §4.13/§5.5. On rejection, a bespoke existing `activity_facility_transaction_comment` table also records the reason/comment (write path not individually verified in this pass, but architecturally consistent with every other confirmed write in this service).

**Request (reject)**
```json
{
  "ProcessInstances": [
    { "tenantId": "in", "businessService": "FACILITY_INSTALLATION", "businessId": "bom-uuid-1", "action": "REJECT_AND_ASSIGN_FOR_FIELD_QC",
      "comment": "PHOTOS section rejected: blurry panel photo" }
  ]
}
```
**Response (reject)**
```json
{ "ProcessInstances": [ { "id": "pi-uuid-2", "state": { "state": "PENDING_PART_A" }, "businessId": "bom-uuid-1" } ] }
```
*(Exact state name to confirm against the live `FACILITY_INSTALLATION` config.)*

**Request (approve, all sections passed)**
```json
{
  "ProcessInstances": [
    { "tenantId": "in", "businessService": "FACILITY_INSTALLATION", "businessId": "bom-uuid-1", "action": "APPROVE",
      "comment": "All sections approved" }
  ]
}
```
**Response (approve)**
```json
{ "ProcessInstances": [ { "id": "pi-uuid-4", "state": { "state": "APPROVE" }, "businessId": "bom-uuid-1" } ] }
```

---

## 7. Post-Installation: Asset Handoff, Audit Trail & O&M Eligibility

Mirrors `Livelihood_Installation_Flow_Diagrams.md` §3 Steps 5–7 (system side effects of §6.3's `APPROVE` transition, plus the ticket-raising gate it feeds).

### 7.1 ♻️ Create / Update Asset (handoff + per-asset O&M eligibility) — API #27, #29
`POST /v1/asset/_create` or `/v1/asset/_update?assetID=` (existing, `asset-registry`, already implemented — not the stub endpoints) — extend request by populating the one new nullable column `sourceBomId` **and** setting the existing `isOperational` column to `true`. Called server-side by `field-planner-activity`, **extending** the existing `ActivityService.triggerInstallationCompletionSideEffects()`/`updateAssetOperationalStatus()` call path (which already invokes this same endpoint on facility-activity approval today) rather than introducing a second, separate handoff mechanism. Both fields are set in the same call, at the same trigger point: the moment that specific `bom` row (Machine or Solar) reaches `APPROVE` — the *other* asset at the same facility, if not yet approved, is left untouched.

**DB Write:** ✅/🆕 mixed — `asset` table (PK `asset_id`, plus `facility_id`, `asset_type_id`, `serial_number`, `vendor_id`) exists (`V20250520141800`). `is_operational` ✅ exists (`V20250625141800`) and was **previously write-idle** — backfilled to `false` for existing rows (`V20260109141800`) but never written by application code until this design adds the write. **`source_bom_id` is 🆕** — no migration in this repo adds it; until then, the handoff link can only be stored inside the existing `additional_details` JSONB, not a real column.

**Request**
```json
{
  "assetDetail": {
    "asset": {
      "tenantId": "in", "system": "Livelihood", "facilityID": "site-uuid-42", "assetTypeID": "SOL-PULVERIZER-001-MACHINE",
      "serialNumber": "CG5HP-88213", "vendorId": "org-uuid-1", "isOperational": true,
      "additionalDetails": { "sourceBomId": "bom-uuid-1" }
    }
  }
}
```
**Response**
```json
{ "assetDetail": { "asset": { "assetId": "asset-uuid-1", "wfStatus": "ACTIVE", "isOperational": true } } }
```

**Correction versus an earlier draft of this doc**: O&M eligibility is **per-asset, not per-facility** — `health-facility-registry`'s site-level `facility.isOnmReady` (migration `V20251030113000`) can't represent a site's Machine and Solar becoming independently raisable as each is approved. This design reuses `asset-registry`'s `isOperational` column instead (LLD §3.4/§3.5); `facility.isOnmReady` itself is untouched but is no longer this feature's eligibility mechanism.

### 7.2 🆕 Search Audit Trail — API #28
`POST /v1/audit-trail/_search` — new, `field-planner-activity`; read-only visibility into the FR-14-mandated audit trail (every state-changing action, actor, timestamp, before/after) that isn't already covered by `egov-workflow-v2`'s own transition history on `bom`.

**DB Write:** No (read-only) — but the table it reads, `installation_audit_trail`, is itself 🆕: confirmed absent from the codebase (zero references to `AuditTrail`/`installation_audit_trail` anywhere). The corresponding *create* has no dedicated API in this doc — it would fire as an internal side effect alongside §7.1/§6.3's workflow transitions, once built. Per LLD §3.3, the proposed shape is `id, tenant_id, entity_type, entity_id, action, actor_id, before_state, after_state, created_time`.

**Request**
```json
{ "criteria": { "tenantId": "in", "entityType": "BOM", "entityId": "bom-uuid-1" } }
```
**Response**
```json
{
  "auditTrail": [
    { "action": "APPROVE_SECTION", "actorId": "hrms-reviewer-uuid", "createdTime": 1721659000000,
      "beforeState": { "status": "PENDING_PART_A" }, "afterState": { "status": "APPROVED" } }
  ]
}
```

### 7.3 ♻️ Check O&M Eligibility (per-asset) — API #30
`POST /v1/asset/_search` (existing, `asset-registry` — already used as a search filter on `isOperational` per `AssetService.java`), filtering by `facilityID` and reading back `isOperational` per asset. No separate API — this is the same call for both callers:
- **im-services' ticket-creation gate** (§7.4) — scoped to the specific asset the end user is raising a ticket against.
- **WhatsApp chatbot's asset picker** (new consumer, LLD §3.5) — queries this same endpoint for the end user's facility; an asset with `isOperational: false` is never offered.

**DB Write:** No (read-only) — reads `asset.is_operational`.

**Request**
```json
{ "assetSearchCriteria": { "tenantId": "in", "facilityID": "site-uuid-42" } }
```
**Response**
```json
{ "asset": [ { "assetId": "asset-uuid-1", "facilityID": "site-uuid-42", "isOperational": true } ] }
```

### 7.4 🔧 Raise Ticket (extended with per-asset eligibility gate) — API #31
`POST /v2/request/_create` (existing, `im-services` — the Setu4Livelihoods ticket-creation API you already built) — extend only the server-side handler to call §7.3 (scoped to the asset the ticket names, not just the facility) before persisting the `Incident`; no request/response shape change for the happy path, one new error code for the blocked path.

**DB Write:** ✅ `im-services`' own `Incident` table (not in this feature's schema scope — pre-existing) — gated by a read of `asset.is_operational`.

**Request** (unchanged shape — `assetId` was already present on `Incident` per the existing Setu4Livelihoods model, now the field this gate actually checks)
```json
{
  "incident": { "tenantId": "in", "incidentType": "EQUIPMENT_ISSUE", "facilityId": "site-uuid-42", "assetId": "asset-uuid-1", "reporter": { "uuid": "end-user-uuid" } },
  "workflow": { "action": "APPLY" }
}
```
**Response (blocked — new error case)**
```json
{
  "ResponseInfo": { "status": "failed" },
  "Errors": [ { "code": "ASSET_NOT_OM_ELIGIBLE", "message": "This asset's installation has not yet been approved for O&M support." } ]
}
```

---

## 8. Scheduled Notification Jobs

Mirrors `Livelihood_Installation_Flow_Diagrams.md` §4. Both jobs run **daily** on the existing `amc-scheduler-service` but are gated to a **weekly** cadence per Plan by a "last notified" timestamp — no new controller of their own, both reuse existing search/update endpoints already itemized above. Previously undocumented in this file (the Flow Diagrams doc explicitly notes "neither job is itemized in the API Summary table" — that gap is closed here).

### 8.1 Job 1 — "Planned Installation breached" weekly summary — API #32
Trigger: `field_plans.status = 'PUBLISHED'`, `end_date < now()`, and at least one facility in scope not yet fully installed ("fully installed" = every `bom` row for that `facility_activity` reached `APPROVE`, same completeness test as §8.2).

**API calls used** (all existing endpoints, no new controller):
1. `POST /v1/field-plans/_search` (implied) — reads `field_plans` (`status`, `end_date`, `senior_contact_email`)
2. `POST /v1/bom/_search` (§4.9) — reads `facility_activities`/`bom` completeness
3. `im-services`' `LivelihoodEmailNotificationService` — Email to Senior Programme Manager
4. `POST /v1/field-plans/_update` (implied) — writes `installation_breach_last_notified_time`

**DB Write:** 🆕 `field_plans.installation_breach_last_notified_time` — column not found in any migration in this repo (same gap as §4.4's other proposed `field_plans` columns); replaces a simpler one-shot `start_date_breach_notified BOOLEAN` design specifically because the updated §9 Notification Matrix makes this a recurring weekly summary, not a fire-once notification. Reads `field_plans`, `facility_activities`, `bom`. Email delivery is Kafka-topic-based; the `field_plans` update reuses the same `update-fieldplan` producer confirmed for §4.4/§4.13.

**Sample Request** (call 1, illustrative)
```json
{ "criteria": { "tenantId": "in", "status": "PUBLISHED", "endDateBefore": 1724198400000 } }
```
**Sample Response** (call 1, illustrative)
```json
{ "FieldPlan": [ { "id": "IP-2026-001", "status": "PUBLISHED", "endDate": 1724198400000, "additionalDetails": { "seniorContactEmail": "ravi.kumar@selco.example" } } ] }
```
**Sample Kafka message** (call 3, illustrative)
```json
{
  "topic": "email-send-consumer",
  "value": { "tenantId": "in", "emailType": "INSTALLATION_BREACH_WEEKLY_SUMMARY", "recipientEmail": "ravi.kumar@selco.example",
    "templateParams": { "planId": "IP-2026-001", "pendingSites": 4 } }
}
```

### 8.2 Job 2 — "<40% complete, 10 days prior to end date" weekly summary — API #33
Trigger: `field_plans.status = 'PUBLISHED'`, currently within 10 days of `end_date`, and completion percentage across the Plan's facilities is below 40% (same completeness test as §8.1).

**API calls used**:
1. `POST /v1/field-plans/_search` (implied) — reads `field_plans` (`status`, `end_date`, `createdby`)
2. `POST /v1/bom/_search` (§4.9) — reads completion % (approved `bom` / total `facility_activities`)
3. `egov-hrms` employee lookup (implied) — resolves `field_plans.createdby` to a Program POC email (Program POC = "person who made the Plan," i.e. `field_plans.createdby`, an existing standard DIGIT audit column — no new column needed for this part)
4. `im-services`' `LivelihoodEmailNotificationService` — Email to Program POC
5. `POST /v1/field-plans/_update` (implied) — writes `low_completion_last_notified_time`

**DB Write:** 🆕 `field_plans.low_completion_last_notified_time` — same gap as §8.1's timestamp column, same `update-fieldplan` producer. Reads `field_plans`, `facility_activities`, `bom`.

**Sample Request** (call 2, illustrative)
```json
{ "criteria": { "tenantId": "in", "fieldPlanId": "IP-2026-001" } }
```
**Sample Response** (call 2, illustrative)
```json
{ "totalFacilityActivities": 20, "approvedBom": 6, "completionPercent": 30 }
```
**Sample Kafka message** (call 4, illustrative)
```json
{
  "topic": "email-send-consumer",
  "value": { "tenantId": "in", "emailType": "LOW_COMPLETION_WEEKLY_SUMMARY", "recipientEmail": "pm.creator@selco.example",
    "templateParams": { "planId": "IP-2026-001", "completionPercent": 30 } }
}
```

---

## 9. Data Mapping Reference — Table → API Cross-Index

Quick-lookup companion to §3–§8 above (each of which already states its own **DB Write** line) — use this table to go the other direction: "which API(s) touch table X." ✅ = column/table confirmed in a checked-in migration; 🆕 = LLD-proposed, not yet migrated (repo-wide search found zero matches).

| Table | Owning service | Status | Written by (§ ref) |
|---|---|---|---|
| `project` | `project` | ✅ live | §4.1 |
| `PROJECT_FACILITY` | `project` | ✅ live | §4.3 |
| `field_plans` | `field-planner` | ✅ live, 🆕 6 columns pending (`sectors`, `senior_contact_*`, `published_time`, 2× `*_last_notified_time`) | §4.4, §4.13, §8.1, §8.2 |
| `activity_assignments` | `field-planner` | ✅ live (incl. `role`, `poc_number`) | §4.5 |
| `field_plan_facilities` | `field-planner` | ✅ live, 🆕 2 columns pending (`solution_id`, `lock_status`) | §4.7 |
| `facility_activities` | `field-planner` | ✅ live | internal, alongside §4.7 |
| `eg_mdms_data` | `egov-mdms-service-v2` | ✅ live (generic) | seeded master data, not API-written — read by §3.1, §4.10 |
| `bom` | `field-planner-activity` | ✅ live, 🆕 5 columns pending (`asset_type`, `solution_id`, `vendor_org_id`, `vendor_email`, `otp_uuid`) | §4.9, §5.2, §5.5 |
| `bom_document` | `field-planner-activity` | ✅ live | §5.4, §5.6 |
| `bom_section_review` | `field-planner-activity` | 🆕 table absent | §6.2 |
| `installation_template` | `field-planner-activity` | 🆕 table absent | §4.11 |
| `eg_wf_processinstance_v2` | `egov-workflow-v2` | ✅ live | §4.13, §5.5, §6.3 |
| `asset` | `asset-registry` | ✅ live, 🆕 1 column pending (`source_bom_id`) | §7.1 |
| `installation_audit_trail` | `field-planner-activity` | 🆕 table absent | (no create API itemized — see §7.2) |

**Example thread** used consistently across §3–§9: Project `proj-uuid-1` → Plan `IP-2026-001` → Site `site-uuid-42` → Solution `SOL-PULVERIZER-001` → Vendor `org-uuid-1` → BOM `bom-uuid-1` → Asset `asset-uuid-1`.

---

## 10. Cross-Cutting Notes

Items that don't belong to one single API above (implementation caveats, integration risks, and a couple of corrections that superseded earlier drafts of this doc but affect more than one section).

- **Two different call styles for §5.2/§5.3, deliberately**: OTP generation/validation (`egov-otp`'s `_create`/`_validate`) is a **synchronous REST call** — a real, externally-hosted service with a request/response contract, already integrated once in this platform (`amc-scheduler-service`). SMS **delivery** of the resulting code, by contrast, is asynchronous (Kafka) — `im-services`' own SMS/Email notification services publish to a Kafka topic consumed by `egov-notification-sms`/an email consumer, with no controller in this repo to call directly. Don't conflate the two.
- **`egov-otp` is not vendored in this repo** — no source code, only client-side integration (`amc-scheduler-service`) and config (`egov.otp.host`, etc.) referencing it as an externally-deployed service. Confirm it's actually deployed/reachable in this platform's environment before building §5.2/§5.3 against it.
- **`egov-filestore`'s `/filestore/v1/files` endpoint** (§5.4) is the standard DIGIT convention but was not independently located/verified in this repo scan — confirm the exact path before implementation.
- **`asset-registry`'s bulk-create and AMC/workflow endpoints are stubs** (`NOT_IMPLEMENTED`, 501) in the current codebase — §7.1 deliberately uses the already-implemented single-asset `_create`/`_update` endpoints instead.
- Business-service configs for `INSTALLATION_PLAN` (§4.13) and reuse of `FACILITY_INSTALLATION` (§6.3) are one-time config registrations against the existing generic `egov-workflow-v2` config-loading mechanism — not itemized as separate APIs.
- **`FACILITY_INSTALLATION`'s exact intermediate states are not in any checked-in config file** — unlike `INSTALLATION_PLAN` (a genuinely new business service this doc defines from scratch), `FACILITY_INSTALLATION`'s states/actions live only in the live `egov-workflow-v2` database. §5.5/§6.3's response samples show plausible intermediate state names (`PENDING_PART_A`) that need confirming against the actual running configuration before implementation.
- **Major correction, still relevant across §4.9–§7.2: an installation-report review/approval system already exists and this doc builds on it, not around it.** `installation_asset`, `ic_report`, `ic_report_document`, and `ic_report_section_review` from earlier drafts are gone — `bom` (existing, altered) absorbed the first two, `bom_document` (existing) absorbed the third, and `bom_section_review` (new) is the only genuinely new table for review granularity. The whole `IC_REPORT` business-service design was dropped in favor of the existing, live `FACILITY_INSTALLATION` business service.
- A **separate, dead business service** (`asset-installation`, `docs/asset-registry/workflows/AssetInstallationWorkflow.json`) exists in this repo but is referenced by no code anywhere — don't confuse it with the live `FACILITY_INSTALLATION` used throughout §5–§6.
- **IC Report content is entered directly in the Android app by the Field Technician** (§5.5) — one actor, one submission. The field list is modeled on the real sample workbook (`ICC_Report_Format_by_Solutionv1.xlsx`), but that file is a reference for what fields to capture, not a transport mechanism — there's no PM-facing Excel upload step for the report itself, and no separate `report_excel_filestore_id`/`report_uploaded_by` tracking on `bom`.
