# Deployment

This page is a high-level orientation only — no hostnames, credentials, or environment-specific values are reproduced here.

## Shape of a deployment

Each backend service and frontend app is built into its own Docker image by its dedicated GitHub Actions workflow (see [CI/CD](ci-cd.md)) and deployed independently, consistent with the platform's microservice architecture. Deployments follow the same push-to-`develop`/`staging` or tag (`v*`) triggers the CI workflows use.

## Environments

The workflows reference at least two long-lived branches (`develop`, `staging`) as deployment triggers, plus tagged releases (`v*`) — implying a typical develop → staging → tagged-release promotion flow, though the exact environment topology (which cluster/namespace each maps to) is configured outside this repository and is not documented here.

## Dependencies a deployment needs running

Per [Overview → Architecture](../overview/architecture.md), a working deployment needs the shared infrastructure (Postgres, Kafka, Elasticsearch), the DIGIT platform backbone services, the relevant domain services for whichever modules are in scope, and MDMS/workflow business-service configuration seeded for the `livelihood` tenant.

## Where to look

- `.github/workflows/` for the exact build/deploy steps per service.
- Each service's own `LOCALSETUP.md`/`README.md` for what configuration it expects at runtime.
