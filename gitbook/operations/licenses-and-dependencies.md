# Licenses and dependencies

## Repository license

The repository root ships a permissive **MIT License** (`LICENSE`), copyright SELCO Foundation. Consult the file itself for the full text before redistributing or relying on this repository's licensing terms.

## Package managers in use

- **Maven** (`pom.xml`) — every Java service under `backend/core-services/` and `backend/e4h-services/` (e.g. `egov-workflow-v2`, `egov-filestore`, `health-facility-registry`, `im-services`, `asset-registry`, `field-planner`, `field-planner-activity`, `project`, `vendor-registry`, `egov-hrms`, `rms-service`, `im-services-analytics`, `amc-scheduler-service`, `processor-services`).
- **npm/pnpm** (`package.json`) — all three frontend apps: `frontend/livelihood-ui`, `frontend/installation-ui`, `frontend/micro-ui`. `livelihood-ui` specifically uses pnpm (via Corepack) rather than npm/yarn.
- **uv** (Python) — `backend/e4h-services/ingestion-service`, the platform's only Python service, managed via `uv sync`/`uv run` rather than pip/poetry.

## Where to look for exact dependency versions

Each service's own `pom.xml` / `package.json` / `pyproject.toml`-equivalent (uv's lockfile) is the source of truth for exact dependency versions — this page intentionally does not enumerate individual library versions, since those change independently of this documentation and would go stale quickly.
