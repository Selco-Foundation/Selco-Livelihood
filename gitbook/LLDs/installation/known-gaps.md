# Known Limitations & In Progress

The Installation module's design has gone through several rounds of revision as it was checked against the actual codebase. This page lists what is confirmed **not yet implemented**, or where the design's assumptions about the platform's live configuration are still unconfirmed — so this documentation doesn't present in-progress work as finished functionality.

## Not yet implemented

- **The per-component `facility_activities` split is not yet built.** The design calls for splitting each site's installation into two rows (`SOLAR` / `MACHINE`) via a new `component_type` column and an extended uniqueness constraint. As of this writing, the service's facility-activity creation logic still emits one row per site, not two. This is the single largest concrete gap between the current design and the current code.
- **Submission-side workflow action is unconfirmed against a live environment.** The IC Report review business service's *review*-side actions (Approve, Reject, Flag) are confirmed actively used in the shipped Reviewer screen today. Its *submission*-side action — the single `SUBMIT_REPORT` action described in [Workflow & Roles](workflow-roles.md) — is this module's own proposed design, not something confirmed to exist in a running workflow-engine configuration. No version-controlled config file for this business service's full definition ships in this repository; its exact registered states should be confirmed against a live instance before the submission flow is built against it.
- **`FIELD_STAFF` is not yet a defined role code.** The Field Technician role this design specifies has no corresponding role constant in the service's role-constants file yet — it exists only as a design decision and as the pre-seeded, unassigned SPOC role on the platform's Installation activity type.
- **Asset creation on approval is unwired.** Approving an IC Report is supposed to create/activate the corresponding Asset record(s) in `asset-registry`, scoped to that specific component. This handoff is not yet implemented — approving a report today does not create an asset as a side effect.
- **Per-asset O&M-eligibility flag is new and not yet wired end-to-end.** Whether an asset is eligible for the support-ticket / O&M workflow is meant to be tracked per-asset (distinct from an existing, unrelated "operational" flag) rather than per-site — this column and its consumers (ticket-raising eligibility gate, a chatbot asset picker) are part of the design but not confirmed complete.

## Naming not yet applied in code

Several role and status renames are agreed in design but not yet applied to the codebase, so code and documentation may temporarily disagree on names:

- The Installation Reviewer role is currently implemented under an older, QC-team-oriented role name in code; the rename to a plain `INSTALLATION_REVIEWER` name is agreed but not yet applied everywhere it's referenced.
- The pending-review status on the IC Report workflow currently carries a legacy name inherited from an earlier "Supervisor" concept that no longer exists in this design; renaming it is a real behavior change (several frontend screens filter on the literal legacy string today), not just a documentation edit.
- The End User Admin role is functionally in place under a name borrowed from the platform's health-sector origins; renaming it to match Livelihood terminology, and extending its entity with Livelihood-specific fields (End User Sector, End User Type), is still open — see [Admin functionality → Known gaps](../admin-functionality/admin-functionality-lld.md#known-gaps).

## Open design questions

- **A `FLAG_FOR_QC` action appears in the Reviewer screen with no confirmed matching workflow state.** Whether this is still a live, working action or now silently fails depends on the actual registered configuration of the review business service in a given environment — not resolvable from source alone. Regardless, this design's Reviewer flow does not surface it as one of the two supported outcomes (Approve / Reject).
- **Per-section rejection reasons reuse an existing transaction-comment mechanism** rather than a dedicated table — this is confirmed as the intended design, but the relabeling of section names it depends on (from asset-type names to report-section names) still needs to be applied consistently.

## What this means for implementers

Treat this module's design documents (data model, flow, workflow) as the **target state** the team is building toward, cross-checked against the actual code at time of writing — not as a description of a fully shipped feature. Before wiring a new feature against any workflow business service named here, confirm its actual registered states and actions against a running `egov-workflow-v2` instance rather than assuming this documentation's state diagrams are already live.
