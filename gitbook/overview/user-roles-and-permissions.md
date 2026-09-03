# User roles and permissions

This page summarizes who uses the platform and how their role maps onto the platform's actual role codes. Full detail, including the module-by-module gap analysis, lives in [LLDs → Admin functionality](../LLDs/admin-functionality/admin-functionality-lld.md).

## Role model

Most of the roles a product spec might describe as "new" for Livelihood turn out to already exist in the platform under different names — the Admin module's design work has mostly been about **mapping** roles onto existing platform role codes rather than inventing new ones from scratch:

| Conceptual role | Platform role code | Status |
|---|---|---|
| Super Admin | `ORG_PLATFORM_ADMIN` | Already functions as the top-level gate platform-wide. |
| Organisation POC | `ORG_ADMIN` | Exists as a distinct code; org-scoped management still needs verification. |
| Vendor POC | a boolean "vendor admin" flag, OR'd with the Super Admin gate | Only a loose flag today, not a dedicated scoped role code. |
| Program POC | `LIVELIHOOD_POC` | Implemented, but isolated inside the incident-management service rather than integrated into the Admin module's own org/role structure. |
| Installation Reviewer | an existing QC-team-oriented role code | Functionally identical to the intended role; a plain rename is agreed but not yet applied. |
| AMC Reviewer | `AMC_REVIEWER` | Exact match. |
| Project Manager | `PROJECT_MANAGER` | Exact match, though redeclared independently in several backend services rather than centralized. |
| End User Admin | `FACILITY_ADMIN` | Same role/responsibility as intended; renaming and entity-field extension still open. |
| Field Staff (Installation) | design-proposed, pre-seeded placeholder only | See [LLDs → Installation → Known gaps](../LLDs/installation/known-gaps.md). |
| AMC Field Staff | `AMC_FIELD_STAFF` | Exact match. |

## Who's who, by module

| Role | Primary responsibility |
| --- | --- |
| Super Admin / Organisation POC / Vendor POC | Platform, organisation, and vendor-org administration |
| Project Manager | Creates Projects and Installation Plans, assigns vendors and reviewers |
| Field Technician (Installation SPOC) | Performs installation, submits IC Reports |
| Installation Reviewer | Approves/rejects submitted IC Reports |
| Program POC | State-scoped oversight of tickets and installation progress |
| Facility Manager (End User) | Raises support tickets for their site's assets |
| Vendor | Resolves support tickets for the assets they installed |
| CRM user | Manages RMS-driven automatic ticket creation (pause/resume) |
| Enumerator / Field POC | Submit phone and site-visit assessments respectively (Assessment module) |

## What the Admin module manages

- **Organisation Management** — platform organisations and vendor organisations, their sub-type classification, and their state/jurisdiction assignment.
- **User & Role Management** — creating users, assigning roles scoped correctly to a Platform Organisation vs. a Vendor Organisation.
- **End User Management** — onboarding end-user sites and their operating contact, including bulk add via an Excel template-and-validate flow (reusing the same ingestion engine used elsewhere in the platform).

For the full role-by-role gap analysis (what's already there, what needs modification, and what's completely new), see [LLDs → Admin functionality](../LLDs/admin-functionality/admin-functionality-lld.md).
