# eGov Workflow v2

`backend/core-services/egov-workflow-v2`

## What it does

A generic, config-driven workflow engine: a series of steps that move a process from one state to another via actions performed by different actors (human, machine, time-based), driven by a predefined configuration rather than hand-rolled code per service. Depends on `egov-mdms` and `egov-user`.

Nearly every stateful process in Livelihood is registered here as a **Business Service** — `LivelihoodIncident` (support tickets), `INSTALLATION_PLAN` (Plan publish), and `FACILITY_INSTALLATION` (IC Report review). See [Workflows and crons](../workflows-and-crons.md) for the full picture.

## Where to look

- `backend/core-services/egov-workflow-v2/README.md`
- Its Swagger API contract.
