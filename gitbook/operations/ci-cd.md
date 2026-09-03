# CI/CD

CI/CD is implemented as GitHub Actions workflows under `.github/workflows/`, one workflow per deployable service or app, each building and pushing a Docker image. A representative workflow (`livelihood-ui.yaml`) triggers on pushes to `develop`/`staging` and on `v*` tags, scoped to changes under that app's own path (`paths: frontend/livelihood-ui/**`), plus a manual `workflow_dispatch` trigger — the same shape is used across the other workflows in this list.

## Backend service workflows

`amc-service.yaml`, `asset-registry.yaml`, `boundary-service.yaml`, `field-planner.yaml`, `field-planner-activity.yaml`, `filestore.yaml`, `hrms.yaml`, `idgen.yaml`, `im-services.yaml`, `im-services-analytics.yaml`, `inbox.yaml`, `ingestion-service.yaml`, `processor-service.yaml`, `project-service.yaml`, `rms-service.yaml`, `vendor-Registry.yaml`, `workflow-v2.yaml`, `facility-registry.yaml`

## Frontend / UI workflows

`digit-ui.yaml`, `livelihood-ui.yaml`, `workbench-ui.yaml`, `installation-qc.yaml`, plus a set of state-specific UI build workflows inherited from the platform's multi-state deployment model: `assam-ui.yaml`, `gujarat-ui.yaml`, `maharashtra.yaml`, `maharastra-ui.yaml`, `manipur-ui.yaml`, `meghalaya-ui.yaml`, `mizoram-ui.yaml`, `nagaland.yaml`, `odisha-ui.yaml`, `sikkim-ui.yaml`

## Other

`sonarcloud.yml` — static analysis / code-quality scanning.

## What this means in practice

Each service builds and deploys independently, triggered only by changes to its own path — there is no single monolithic build pipeline. This mirrors the platform's microservice structure: a change to `field-planner` alone triggers only the `field-planner.yaml` workflow, not a full-platform rebuild. Exact registry destinations, deployment targets, and required secrets are configured as GitHub Actions secrets/environment values and are intentionally not reproduced in this documentation.
