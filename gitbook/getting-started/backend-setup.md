# Backend setup

Each backend service that needs local bring-up ships its own setup docs under `backend/`. As a starting point:

- `backend/e4h-services/<service>/LOCALSETUP.md` — per-service local setup for the domain services (e.g. `project`, `field-planner`, `field-planner-activity`, `im-services`, `vendor-registry`, `egov-hrms`, `amc-scheduler-service`)
- `backend/core-services/<service>/LOCALSETUP.md` — platform backbone services vendored in this repo (`egov-workflow-v2`, `egov-filestore`, `egov-notification-sms`, `egov-idgen`)
- `backend/e4h-services/ingestion-service/README.md` — the Python (uv-managed) ingestion service, run separately from the Java services

## General shape

1. Start (or connect to) the shared infrastructure — Postgres, Kafka, Elasticsearch — and the DIGIT backbone services listed in [Local setup](local-setup.md).
2. Run each Java service's Flyway migrations to bring its schema up to date (each service manages its own schema independently).
3. Start each service with its own `application.properties`/environment configuration, pointed at the shared infrastructure.
4. For `ingestion-service`, install [`uv`](https://docs.astral.sh/uv/), run `uv sync` from its root folder, ensure a local `.env` has the required values, and run `uv run -m app.main`.
5. Confirm MDMS master data and `egov-workflow-v2` business-service registrations exist for the `livelihood` tenant before exercising any workflow-driven flow (ticket creation, Plan publish, IC Report review).

No exact ports, hostnames, or credential values are reproduced here — check each service's own `LOCALSETUP.md`/`README.md`, which is kept in sync with the actual code.
