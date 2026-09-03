# Admin functionality

The Admin module covers the organisation, user, and role management that every other module depends on: who can act as a platform administrator, who administers a single organisation or vendor, and how end-user sites and their operators are onboarded.

Its scope is deliberately narrow: role/RBAC structure and the screens that depend on it (Organisation Management, User & Role Management, End User Management). Installation Plan/Report workflow internals are covered in [LLDs → Installation](../installation/README.md), not here.

## Role model

Most of the roles a product spec might describe as "new" for Livelihood turn out to already exist in the platform under different names — the module's design work has mostly been about **mapping** roles onto existing platform role codes rather than inventing new ones from scratch:

| Conceptual role | Platform role code | Status |
|---|---|---|
| Super Admin | `ORG_PLATFORM_ADMIN` | Already functions as the top-level gate platform-wide. |
| Organisation POC | `ORG_ADMIN` | Exists as a distinct code; org-scoped management still needs verification (see [Known gaps](#known-gaps)). |
| Vendor POC | a boolean "vendor admin" flag, OR'd with the Super Admin gate | Only a loose flag today, not a dedicated scoped role code. |
| Program POC | `LIVELIHOOD_POC` | Implemented, but isolated inside the incident-management service rather than integrated into the Admin module's own org/role structure. |
| Installation Reviewer | an existing QC-team-oriented role code | Functionally identical to the intended role; a plain rename is agreed but not yet applied. |
| AMC Reviewer | `AMC_REVIEWER` | Exact match. |
| Project Manager | `PROJECT_MANAGER` | Exact match, though redeclared independently in several backend services rather than centralized. |
| End User Admin | `FACILITY_ADMIN` | Same role/responsibility as intended; renaming and entity-field extension still open. |
| Field Staff (Installation) | design-proposed, pre-seeded placeholder only | See [LLDs → Installation → Known gaps](../installation/known-gaps.md). |
| AMC Field Staff | `AMC_FIELD_STAFF` | Exact match. |

## What the module manages

- **Organisation Management** — platform organisations and vendor organisations, their sub-type classification, and their state/jurisdiction assignment.
- **User & Role Management** — creating users, assigning roles scoped correctly to a Platform Organisation vs. a Vendor Organisation.
- **End User Management** — onboarding end-user sites and their operating contact, including bulk add via an Excel template-and-validate flow (reusing the same ingestion engine used elsewhere in the platform for facility/asset/vendor/staff templates).

Boundary (state/district/block) data is available platform-wide without manual re-entry in the Admin module — several other services already consume the shared boundary service rather than a static file, and the Admin module's own screens are expected to follow the same reuse pattern.

## Roles & Permissions — full gap analysis

### Already there — no change needed

- **AMC Reviewer** reviews AMC reports/activities — the role already gates the AMC module end-to-end.
- **AMC Field Staff** performs/submits AMC field activities — already a distinct role from AMC Reviewer.
- **Project Manager** creates, manages, and schedules Projects — the generic Project entity and its tables already exist and are not something this module introduces net-new.
- **Installation Reviewer** (functionally) already reviews, approves, and rejects installation reports under an existing role code — the actions work today; only the role's *name* needs to change.
- **Boundary data** (state/district/block) is already available platform-wide via the shared boundary service, consumed by several other services already — for the Admin module this is a wiring task, not a missing capability.

### Needs modification

| Role | What's needed |
|---|---|
| Super Admin | Formalize the existing top-level gate as an explicit Super Admin role, and confirm it consistently authorizes every capability the role should have — today it's checked ad hoc, module by module, rather than centrally. |
| Organisation POC | Verify or build proper org-scoping, so this role's users manage only their own Platform Organisation's users/roles, not platform-wide. |
| Vendor POC | Introduce a real, dedicated role code scoped strictly to a vendor's own organisation, replacing today's loose flag. |
| Installation Reviewer naming | Apply the already-agreed rename from the legacy QC-team-oriented code to a plain, consistent name, across every place that references it. |
| Field Staff (Installation) | Implement a real role code and wire its report-submission action to a live button/API call — today it exists only as an unassigned placeholder. See [LLDs → Installation → Known gaps](../installation/known-gaps.md). |
| End User Admin naming + fields | Rename to match Livelihood terminology, and extend the End User entity with two fields the product spec requires that don't exist yet: **End User Sector** (e.g. Agriculture, Animal Husbandry, Built Environment, Resilient Micro Business, Textiles & Craft) and **End User Type** (Group / Individual). |
| Vendor Management view | Today an asset can only be mapped to a single vendor with no dedicated UI for re-mapping; either allow per-asset vendor edits through a new screen, or introduce a proper asset-vendor join table if multiple concurrent mappings turn out to be needed. |
| Boundary wiring into Admin | The boundary-service integration pattern used elsewhere in the platform is not yet confirmed wired into the Admin module's own End User creation / Add-User screens. |

### Completely new

- **Program POC integration into the Admin module.** The underlying scoping/reassignment logic already exists, but it's entirely isolated inside the incident-management service and frontend today — bringing it into the Admin module's organisation/role structure is new integration work (though the underlying logic is likely reusable rather than needing a rebuild).
- **Role-scoped "Add User" forms** — differentiating the assignable-role list by whether the user belongs to a Platform Organisation or a Vendor Organisation. No existing screen does this filtering today.
- **Auto-generated End User passwords** on creation, following a defined pattern (first letters of name + phone digits) — no such generation logic exists anywhere in the codebase today.
- **Bulk Add End Users** with a downloadable template, validation, and a downloadable error file for failed rows. The underlying Excel template-generation/upload-parsing engine already exists and is used for facility/boundary/asset/staff templates — End User is simply a new template type to add to that existing engine, not a new engine.
- **Organisation Sub Type removal** — a field present in the platform's health-sector-derived organisation screens needs to be hidden or dropped for Livelihood.
- **A Livelihood-specific theme** for the Admin module UI — purely cosmetic, but genuinely new: only a health-sector theme exists today.

### Known gaps

- None of the near-match role codes (`ORG_PLATFORM_ADMIN`, `ORG_ADMIN`, the vendor-admin flag) are defined in one shared, central place today — each is checked ad hoc per frontend module and redeclared independently per backend service (the same pattern seen with `PROJECT_MANAGER`). Any future rework of Super Admin, Organisation POC, or Vendor POC should centralize these constants rather than adding a fourth parallel definition.
- Whether `ORG_ADMIN` is actually wired to a per-organisation-scoped view anywhere today is unverified — flagged as a "needs modification" item above rather than confirmed complete.
