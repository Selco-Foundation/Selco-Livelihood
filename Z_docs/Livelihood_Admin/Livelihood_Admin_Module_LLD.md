# Livelihood Admin Module — Low-Level Design

Companion engineering doc to `LivelihoodAdminModulePRD.pdf`. Covers: role-by-role gap analysis (existing vs. modify vs. new) and the near-name-match role mapping the PRD doesn't state explicitly.

**Scope:** role/RBAC structure and the admin-module screens that depend on it (Organisation Management, User & Role Management, End User Management). Installation Plan/Report workflow internals are out of scope here — see `Livelihood_Installation_LLD.md`.

**Method:** every claim below is code-verified (role constant, file, line) against the current repo, not inferred from the PRD text alone.

---

## 1. Role Mapping — PRD vs. Existing Code

The PRD (§4–§6) never states that it is reusing existing role codes under new names — the resemblance was only found by grepping role constants across the E4H baseline (`vendor-registry`, `org` module) and the Livelihood-specific services. This is the key finding of this doc: **most PRD roles are closer to already-existing E4H roles than the PRD's own naming suggests.**

### Super Admin → `ORG_PLATFORM_ADMIN`
**Near-match, different name.** Already used as the top-level/superset gate:
`if (!currentUserRoleCodes?.includes("ORG_PLATFORM_ADMIN") && !isVendorAdminUser)`, and seeded as a role code in `im-services` migration `V20260420140000__MigrateComplaintResolversToVendorOrgs.java:247`.
Found in: `frontend/installation-ui/.../modules/org/src/Module.js:23`, `ORGCard.js:35`

### Organisation POC → `ORG_ADMIN`
**Near-match, different name.** Distinct constant `ORG_ADMIN_ROLE_CODE = "ORG_ADMIN"` already exists in vendor-registry, separate from `ORG_PLATFORM_ADMIN` — this is the org-scoped code the PRD's "decentralised, per-organisation POC" concept maps onto.
Found in: `backend/e4h-services/vendor-registry/src/main/java/org/egov/util/OrganisationConstant.java:21`

### Vendor POC → "Vendor Administrator" (`isVendorAdminUser`)
**Partial match.** Exists only as a display-name/boolean flag OR'd alongside `ORG_PLATFORM_ADMIN`, not a clean, separately-scoped role code.
Found in: `frontend/installation-ui/.../modules/org/src/Module.js:22`, `ORGCard.js:18`

### Program POC → `LIVELIHOOD_POC`
**Same concept, wrong module — isolated.** Ticket-scoping/reassignment logic already exists, but only inside `im-services` (Incident Management), resolved via HRMS boundary jurisdiction. Zero linkage to `org`/`pm` modules or vendor-registry.
Found in: `backend/e4h-services/im-services/.../IMConstants.java:83`; consumers: `NotificationService`, `LivelihoodCreateService`, `HRMSUtil`, `LivelihoodPocScopeService`; frontend: `frontend/livelihood-ui/src/modules/im/*`

### Installation Reviewer → `INSTALLATION_REPORT_APPROVER_QC_TEAM`
**Near-match, different name.** Functionally identical (approve/reject/flag installation reports); a rename to `INSTALLATION_REVIEWER` is already proposed in `Livelihood_Installation_Business_Service.md` and `Livelihood_Installation_LLD.md`, not yet applied to code.
Found in: `backend/e4h-services/field-planner-activity/.../ActivityConstants.java:36`; frontend `qc` module

### AMC Reviewer → `AMC_REVIEWER`
**Exact match.**
Found in: `frontend/.../modules/amc/src/Module.js:19`, `AMCCard.js:13`; `AmcConfigurationService.java:68`

### Project Manager → `PROJECT_MANAGER`
**Exact match.** Redeclared independently as the same string in 4 backend services (`ProjectConstants.java:31`, `ActivityConstants.java:34`, `FieldPlannerConstants.java:29`, `AmcConstants.java:31`) plus frontend `pm` module and DB seed `V20260604140000__migrate_project_names_to_revised_format.java:424`. Not centralized, but consistent.

### End User Admin → `FACILITY_ADMIN`
**Near-match, different name.** PRD explicitly frames End User as analogous to Facility (§3.3). Same role/responsibility, but `FACILITY_ADMIN` needs to be renamed to `END_USER_ADMIN` (mirrors the `INSTALLATION_REVIEWER` rename pattern) — plus the End User entity's fields need extending.
Found in: `backend/e4h-services/field-planner-activity/.../ActivityConstants.java:35`, `health-facility-registry/.../ServiceConstants.java:14`; frontend `fa` module

### Field Staff → `INSTALLATION_SPOC` (pre-seeded, no live role code yet)
**Design-proposed, not implemented.** Same actor intended, but no `FIELD_STAFF` role code exists in `ActivityConstants.java` today; `activities` master has `required_roles = [INSTALLATION_SPOC, INSTALLATION_REVIEWER]` from migration `V20260331120000`.
Found in: `Livelihood_Installation_Business_Service.md`, `Livelihood_Installation_LLD.md`

### AMC Field Staff → `AMC_FIELD_STAFF`
**Exact match.** Distinct from `AMC_REVIEWER` in scheduling/config logic.
Found in: `backend/docs/cron/run_visit_scheduling.py`; `AmcConfigurationService.java:68`

---

## 2. Fully Already There (no role/permission change needed)

> **PRD basis:** §5–§6 role tables, cross-checked against role constants above.

- **AMC Reviewer reviews AMC reports/activities** — `AMC_REVIEWER` already gates the AMC module end-to-end
- **AMC Field Staff performs/submits AMC field activities** — `AMC_FIELD_STAFF` already distinct from `AMC_REVIEWER` in backend scheduling logic
- **Project Manager creates/manages/schedules Projects** — Generic `project` microservice already exists (`project`, `project_address`, `project_target`, `project_facility`, `project_beneficiary`, `task` tables) — a real Project entity distinct from Installation Plans, not something the PRD introduces net-new
- **Installation Reviewer reviews/approves/rejects installation plans & reports** — `INSTALLATION_REPORT_APPROVER_QC_TEAM` already implements `APPROVE`/`REJECT_AND_ASSIGN_FOR_FIELD_QC`/`FLAG_FOR_QC` on the live `FACILITY_INSTALLATION` workflow
- **State → District → Block boundary data available platform-wide without manual entry** — Already solved generically: `im-services`, `vendor-registry`, `amc-scheduler-service`, and `asset-registry` all already consume DIGIT's `boundary-service` (`egov.boundary.*`/`egov.location.*`, `BoundaryUtil`/`AssetBoundaryService`) rather than a static MDMS JSON file. **Not a gap — a wiring task** (see §3).

---

## 3. Needs Modification (role or entity exists, but shape/scope/naming is off)

### Super Admin
- **Requirement:** highest access, all org/user/role/EndUser-Admin powers
- **Gap:** `ORG_PLATFORM_ADMIN` already functions as this superset gate, but is named/scoped around "org module" rather than explicitly modeled as a platform-wide super-role
- **Change needed:** formalize `ORG_PLATFORM_ADMIN` as the Super Admin role (or introduce an explicit alias) and confirm it consistently ORs into every gate the PRD lists (org mgmt, user mgmt, End User Admin activities) — currently checked ad hoc per module (`org`, `fa`, etc.), not centrally

### Organisation POC
- **Requirement:** org-scoped admin, manages users/roles within own org only
- **Gap:** `ORG_ADMIN` exists as a distinct code from `ORG_PLATFORM_ADMIN`, but current `org` module gating only distinguishes `ORG_PLATFORM_ADMIN`/`isVendorAdminUser` — unclear if `ORG_ADMIN` is actually wired to a per-org-scoped view anywhere
- **Change needed:** verify/build the scoping so `ORG_ADMIN` users only manage users+roles within their own Platform Organisation, not platform-wide

### Vendor POC
- **Requirement:** vendor-org-scoped admin, manages vendor-side users/roles
- **Gap:** only a loose boolean flag (`isVendorAdminUser`) OR'd with `ORG_PLATFORM_ADMIN`, no clean dedicated role code or scoping
- **Change needed:** introduce a proper `VENDOR_POC`-equivalent role code (or formalize the existing flag into one) scoped strictly to the Vendor Organisation the user belongs to

### Installation Reviewer naming
- **Gap:** coded as `INSTALLATION_REPORT_APPROVER_QC_TEAM`; rename already agreed in design docs but not applied
- **Change needed:** apply the `INSTALLATION_REVIEWER` rename in `ActivityConstants.java` and all consumers

### Field Staff
- **Requirement:** submits installation reports from the field, no admin access
- **Gap:** design-proposed only; `INSTALLATION_SPOC` is pre-seeded in the `activities` master but no `FIELD_STAFF` role code or `SUBMIT_REPORT` action is actually wired to any button/API call
- **Change needed:** implement `FIELD_STAFF` role code + wire `SUBMIT_REPORT` action on the live path (currently only referenced inside hardcoded arrays in `useActivityDetails.js`/`useFacilityDetails.js` display-filter hooks, never fired)

### End User Admin naming + entity fields
- **Gap:** role/responsibility (`FACILITY_ADMIN`) is correct, but needs renaming to `END_USER_ADMIN` to match the PRD's terminology; separately, the End User entity lacks PRD-required fields: **End User Sector** (Agriculture/Animal Husbandry/Built Environment/Resilient Micro Business/Textiles & Craft) and **End User Type** (Group/Individual)
- **Change needed:** rename `FACILITY_ADMIN` → `END_USER_ADMIN` in `ActivityConstants.java`/`ServiceConstants.java` and all consumers (same pattern as the Installation Reviewer rename); extend the facility/end-user schema with the two new fields; extend the role's create/edit form accordingly

### Vendor Management view
- **Requirement:** per-asset vendor mapping, editable, feeds issue-reporting platform
- **Gap:** `asset` table only has a single 1:1 `vendor_id` column; no UI exists for re-mapping an individual asset's vendor (existing `VendorOrgTable.js` only lists vendor orgs, doesn't map assets)
- **Change needed:** either allow `asset.vendor_id` to be edited per-asset via a new UI view, or (if multiple concurrent vendor mappings are needed) introduce a proper asset↔vendor join table

### Boundary data wiring into Admin Module
- **Gap:** boundary-service integration exists, but only in `im-services`/`vendor-registry`/`amc-scheduler-service`/`asset-registry` — not yet confirmed wired into the Admin Module's own End User creation/Add-User flows described in PRD §8
- **Change needed:** reuse the existing `BoundaryUtil`/boundary-service client pattern inside the Admin Module's End User and user-creation screens instead of building new ingestion

---

## 4. Completely New (no equivalent anywhere in code or design docs)

- **Program POC role wired into the Admin Module** — `LIVELIHOOD_POC` solves the identical problem (ticket visibility, out-of-scope reassignment) but is entirely isolated inside `im-services`/IM frontend. Bringing this into the Admin Module's org/pm role structure is new integration work, even though the underlying logic can likely be reused rather than rebuilt.
- **Role-scoped "Add User" forms differentiated by org type** (org-side role list vs. vendor-side role list, per PRD §7.4/§7.7) — no existing screen filters the assignable-role dropdown by organisation type; today's `Add User` flow doesn't distinguish which roles are legal for a Platform Org vs. a Vendor Org
- **Auto-generated End User password** (first 4 letters of name + `@` + first 4 digits of phone, e.g. `Bhar@6732`) — no such generation logic found anywhere in the codebase
- **Bulk Add End Users with template download, validation, and downloadable error file** — the `ingestion-service` (Python) has a working Excel template-generation/upload-parsing engine for facility/boundary/asset/staff templates, but no End User template type exists yet — this is a net-new template type, not a net-new engine
- **Organisation Sub Type removal** (PRD explicitly drops this E4H field for Livelihood) — net-new *removal* work: a field currently present in Health-derived Organisation screens needs to be hidden/dropped for Livelihood tenants
- **Setu4Livelihood theme/colour scheme swap** for the Admin Module UI — cosmetic, but genuinely new: no Livelihood-specific admin theme exists today, only the Health E4H theme

---

## 5. Summary

**Already there (4):** AMC Reviewer, AMC Field Staff, Project Manager/Project entity, Installation Reviewer (functionally), Boundary data (generically)

**Needs modification (8):** Super Admin↔`ORG_PLATFORM_ADMIN`, Organisation POC↔`ORG_ADMIN`, Vendor POC, Installation Reviewer naming, Field Staff, End User Admin naming + fields (`FACILITY_ADMIN`→`END_USER_ADMIN`), Vendor Management mapping, Boundary wiring into Admin Module

**Completely new (5 items):** Program POC integration, role-scoped Add User forms, auto-generated password, Bulk Add End Users template, Org Sub Type removal, theme swap

**Biggest structural risk:** none of the "near-match" roles (`ORG_PLATFORM_ADMIN`, `ORG_ADMIN`, `isVendorAdminUser`) are defined in one shared/central place — each is checked ad hoc per frontend module and redeclared per backend service (same pattern already observed for `PROJECT_MANAGER`). Any Super Admin / Organisation POC / Vendor POC rework should also centralize these constants rather than adding a fourth parallel definition.
