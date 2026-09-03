# Local setup

This page gives a conceptual overview of what it takes to run the platform locally. It intentionally does not repeat exact commands, hostnames, credentials, or environment values — those live in each service's own setup docs in the repository and should be treated as the source of truth.

## What you need, conceptually

- **A DIGIT backbone stack** — Postgres, Kafka, Elasticsearch, and the shared platform services (`egov-user`, `egov-otp`, `egov-localization`, `egov-idgen`, `egov-filestore`, `egov-mdms-service-v2`, `egov-workflow-v2`, `boundary-service`, `egov-persister`, `egov-indexer`). Most Livelihood services assume these are already reachable — locally via Docker Compose, or forwarded from a shared cluster.
- **The domain services relevant to what you're working on** — for example `health-facility-registry` + `asset-registry` + `vendor-registry` for facility/asset work, `im-services` for the support-ticket workflow, or `field-planner` + `field-planner-activity` for installation.
- **Master data (MDMS) and workflow business-service configuration** seeded for the `livelihood` tenant — issue types, SLA/escalation rules, solution repository entries, and the registered workflow business services (e.g. `LivelihoodIncident`, `INSTALLATION_PLAN`, `FACILITY_INSTALLATION`).
- **A frontend app** — see [Frontend setup](frontend-setup.md).

## General shape of a local bring-up

1. Start (or connect to) shared infrastructure: Postgres, Kafka, Elasticsearch, and the DIGIT backbone services.
2. Run Flyway migrations for each domain service you're standing up (each service manages its own schema).
3. Start the domain services you need, pointed at that infrastructure — see [Backend setup](backend-setup.md).
4. Seed or confirm MDMS master data and workflow business-service registrations for the `livelihood` tenant exist.
5. Start the frontend app(s) you need, configured to point at your backend — see [Frontend setup](frontend-setup.md).

Always check the relevant service's own `LOCALSETUP.md`/`README.md` for exact ports, environment variables, and run commands before starting — those files are kept in sync with the actual code and are more reliable than any summary here. No secrets, credentials, or environment values are reproduced in this documentation.
