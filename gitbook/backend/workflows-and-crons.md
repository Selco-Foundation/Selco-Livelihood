# Workflows and crons

## Workflow engine

Nearly every stateful process in the platform — support tickets, Installation Plan publishing, IC Report review — is implemented as a **Business Service** registered in the platform's generic, config-driven workflow engine (`egov-workflow-v2`), rather than as hand-rolled status fields and if/else transition logic inside each service.

### What a Business Service is

```
BusinessService
├── businessService     — unique name, e.g. "LivelihoodIncident"
├── business             — owning microservice, e.g. "im-services"
├── businessServiceSla   — overall SLA across the whole flow, if any
└── states[]
    ├── state               — null only for the synthetic start state
    ├── applicationStatus   — the status value written back onto the owning entity
    ├── sla                 — per-state SLA, if any
    ├── isStartState / isTerminateState / isStateUpdatable
    └── actions[]
        ├── action     — e.g. "APPROVE"
        ├── nextState  — state this action transitions to
        └── roles[]    — role codes allowed to fire this action
```

Every entity that goes through a workflow carries a `businessId` (a ticket ID, a Plan ID, a report/component ID) plus the business service name, and moves between states through a single generic transition endpoint. The engine itself has no knowledge of what a "ticket" or a "Plan" is; it only knows states, actions, and role gates.

### Business services registered in this platform

| Business service | Owning table | Owning service | Purpose |
|---|---|---|---|
| `LivelihoodIncident` | the incident table | `im-services` | Support-ticket lifecycle — see [LLDs → Livelihood core](../LLDs/livelihood-core/README.md). |
| `INSTALLATION_PLAN` | `field_plans` | `field-planner` | Installation Plan Draft → Published lifecycle — see [LLDs → Installation → Workflow and roles](../LLDs/installation/workflow-roles.md). |
| `FACILITY_INSTALLATION` | `facility_activities` | `field-planner-activity` | IC Report submission and review — see [LLDs → Installation → Workflow and roles](../LLDs/installation/workflow-roles.md). |

### Why this matters architecturally

Using one shared engine for every stateful process means SLA and escalation logic is uniform (per-state SLA timers and breach/escalation calls are available to any business service without reimplementing a timer mechanism), role gating is declarative rather than scattered in application code, and state is always queryable independently of the owning entity's own table via the engine's process-instance history.

### A caution for implementers

Business service definitions are typically registered directly against a running workflow-engine instance (by API call or seed script) rather than checked in as a single canonical config file in every service's repository — so a service's own `application.properties` naming a business service is not, on its own, proof that the business service is registered with the shape a design document describes. Query the engine's own business-service search endpoint before building against an assumed configuration — see [LLDs → Installation → Known gaps](../LLDs/installation/known-gaps.md) for a concrete example of this open verification step.

## Cron / scheduled jobs

A smaller number of flows are driven by a cron trigger rather than a user action or workflow transition:

| Job | Owning service | Cadence | What it does |
|---|---|---|---|
| CO₂-emissions-avoided calculation | `im-services-analytics` | Monthly | Triggered by a cron publishing onto a Kafka topic; loops over every visibility-flagged facility and lifecycle month, publishing actual/projection results for indexing. See [LLDs → RMS → CO2 calculation](../LLDs/rms/co2-calculation.md). |
| RMS anomaly-detection rule engine | `rms-service` | Every 15 minutes (default) | Polls device telemetry, applies anomaly rules, de-duplicates, auto-creates tickets. |
| "Planned Installation breached" summary | `field-planner` | Weekly | Flags Plans past their planned end date without full completion; idempotent via a last-notified timestamp on `field_plans`. |
| "<40% complete near end date" summary | `field-planner` | Weekly | Flags Plans under 40% complete with fewer than 10 days to their planned end date. |
| Support-ticket SLA-escalation check | `im-services` | Periodic | Reads against existing tables/indexes to escalate, remind, or auto-close tickets per the SLA table in [LLDs → Livelihood core](../LLDs/livelihood-core/README.md). |
| AMC / scheduling jobs (OTP client pattern, AMC visit scheduling) | `amc-scheduler-service` | Various | Owns scheduled/cron infrastructure that Installation's OTP acknowledgment step also reuses. |

These scheduled reads/writes are deliberately kept separate from workflow-engine SLAs — for example, Installation's two weekly notification jobs are plain scheduled jobs against `field_plans`/`bom` state, not a workflow-engine SLA, specifically to avoid two competing breach-detection mechanisms for the same Plan.
