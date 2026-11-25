# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Backend for SELCO Foundation's **SETU4Livelihoods** platform: solar-powered livelihood equipment installed for end users (entrepreneurs/beneficiaries), supplied and serviced by onboarded vendors. It covers boundary, end-user, facility, vendor and asset onboarding, field planning and installation, maintenance (AMC), incident/complaint handling, remote monitoring (RMS) and analytics.

This repo is a **fork of the E4H (Energy for Health) backend**. Most services and package names (`org.egov.*`, `e4h-services`, `org.selco.e4h`) are inherited from E4H. Livelihood behaviour sits on top of the shared code:
- Tenant `livelihood` (`im.livelihood.tenant.id`, many `*.tenant.id` defaults).
- Workflow business service `LivelihoodIncident`.
- Localization module `rainmaker-livelihood`.
- `Livelihood*` classes (e.g. `LivelihoodCreateService`, `LivelihoodNotificationService`, `LivelihoodPocScopeService`, `LivelihoodAssetBoundaryEnricher`) and email templates in `im-services/src/main/resources/templates/livelihood/`.

When changing shared code, check whether the path is Livelihood-specific or inherited E4H behaviour.

It is built on the **eGov DIGIT** microservice framework. Every service is an independent Spring Boot app with its own `pom.xml`. There is **no parent/aggregator POM**, so each service is built and run on its own.

```
backend/
  core-services/      DIGIT platform services (forked and customised)
  e4h-services/       Domain services (shared with E4H, extended for Livelihood)
  docs/               Kubernetes CronJob YAMLs, Python cron runners (docs/cron/), API/handover docs
```

## Services

### core-services (DIGIT platform)

| Service | Purpose |
|---|---|
| `egov-workflow-v2` | Generic state machine. Business services (e.g. `LivelihoodIncident`) define states, actions and the roles allowed for each action. |
| `egov-mdms-service-v2` | Master data (tenants, roles, issue types, escalation config, form/section titles, etc.) served at runtime. |
| `egov-idgen` | Generates formatted business IDs (incident numbers, asset IDs, …). |
| `egov-filestore` | File/document upload and retrieval. |
| `egov-notification-sms` | Sends SMS from messages on a Kafka topic. |
| `egov-url-shortening` | Short links used in SMS/notifications (e.g. Livelihood app links). |
| `boundary-service` | Administrative boundary hierarchy (state → district → block …) and boundary relationships. |
| `health-facility-registry` | Facility/site master inherited from E4H, used here with the `livelihood` tenant: create/approve/reject, boundary mapping, mapped vendor, assessment data, Kibana/AMC index sync. |

### DIGIT services used but not in this repo

These run as stock DIGIT deployments. Their code is not here, but services here call them or publish to them.

| Service | Purpose / how it's used here |
|---|---|
| `egov-user` | User accounts, login/OTP, auth tokens. |
| `egov-accesscontrol` | Role → API action mapping; authorises requests. |
| `egov-persister` | Consumes Kafka topics and writes to Postgres using YAML mappings. The mappings for each service live in that service's `src/main/resources` (e.g. `im-services-persister.yml`). Changing a persisted model means changing this YAML. |
| `egov-indexer` | Consumes `*-indexer` Kafka topics and writes to Elasticsearch for search and Kibana dashboards. |
| `egov-localization` | Translated UI and notification messages by locale and module (`rainmaker-livelihood`). |
| `egov-enc-service` | Encrypts and decrypts PII such as phone numbers. |

### e4h-services (domain)

| Service | Purpose |
|---|---|
| `im-services` | **Incident management**: raise, assign, resolve and close complaints on installed equipment. Livelihood incidents use the `LivelihoodIncident` workflow (auto-assign, pending for resolution, out-of-scope / out-of-warranty pending POC or vendor, quotation revision, decline, resolve, close). Also handles end-user ticket creation (incl. IVR), POC scope routing, SMS/email notifications and RMS-generated incidents. |
| `im-services-analytics` | Reporting: Livelihood daily/weekly summary emails to POCs, escalation emails, CO2 emission calculation, CSV exports, Kibana dashboards. Reads Postgres and Elasticsearch. Package `org.selco.e4h`. |
| `rms-service` | **Remote Monitoring System**: pulls device telemetry from vendor RMS APIs, runs anomaly rules, dedupes via `active_alerts`, and auto-creates tickets in im-services. |
| `asset-registry` | Installed assets (equipment) for end users: create/search/update, bulk create, asset workflow, AMC contracts and AMC visits, Livelihood boundary enrichment. |
| `amc-scheduler-service` | Annual Maintenance Contract planning: AMC configuration, AMC plans, scheduled maintenance visits (with OTP confirmation), visit workflow, AMC summary indexing. |
| `field-planner` | Field planning before installation: assessments, field plan templates, field plans, site assignment to plans, ICC reports. |
| `field-planner-activity` | Execution of a field plan: activities and staff assignment, BOM (bill of materials), activity workflow (installation reviewer and field staff flow), installation reports and PDF generation. |
| `project` | DIGIT project registry: projects and the facilities, staff, resources and beneficiaries attached to them. |
| `vendor-registry` | Organisation registry for vendors/contractors: contact details, tax IDs, areas of work. Used for vendor onboarding. |
| `egov-hrms` | Employee management (assignments, jurisdictions). Used to find assignees, POCs and role holders. |
| `inbox` | Aggregated, paginated work-list across a module's records and their workflow state (backs the UI inbox). |
| `processor-services` | Kafka consumers for heavy async work, mainly video processing (FFmpeg quality conversion and upload). |
| `ingestion-service` | **Python** (FastAPI, uv). Excel-template-driven bulk ingestion: boundaries, end users, facilities, assets, BOM/ICC, projects. Validates templates and writes result workbooks. |

### Scheduled jobs

Jobs are not scheduled inside the services. Kubernetes CronJobs (`backend/docs/*-cronjob.yaml`, `rms-*-cron.yaml`) run Python scripts in `backend/docs/cron/`. Each script `POST`s to a service endpoint with a synthetic SYSTEM `RequestInfo`. Jobs: Livelihood daily/weekly summary, daily/weekly escalation, SLA, RMS rule engine, RMS mapping sync/validate/pause-expiry, visit scheduling, carbon emission, theft notification.

## Build & test

Run Maven per service (from the service directory, or with `-f`):

```bash
mvn -B -f backend/e4h-services/im-services/pom.xml package        # build + tests
mvn -f <service>/pom.xml clean compile -DskipTests
mvn -f <service>/pom.xml test -Dtest=ClassName                     # single test class
mvn -f <service>/pom.xml test -Dtest=ClassName#methodName          # single test method
mvn -f <service>/pom.xml spring-boot:run
```

Java/Spring versions differ per service. Check the service's `pom.xml` before using language or API features:
- Most services: Java 17, Spring Boot 3.2.x–3.4.x (`jakarta.*`).
- **Legacy Java 8 / `javax.*`**: `egov-workflow-v2`, `egov-idgen`, `egov-notification-sms` (Boot 2.2), `e4h-services/inbox` (Boot 2.2).

Test coverage is uneven. Postman collections (in service `src/main/resources` / `src/test/resources/postman`, and at the repo root) are the main API test artifacts.

Ingestion service:
```bash
cd backend/e4h-services/ingestion-service
uv sync
uv run -m app.main      # needs .env and kubectl port-forwards
```

## Running locally

Services depend on other DIGIT services and on Postgres and Kafka; some also need Elasticsearch. Follow the service's `LOCALSETUP.md` if present:
1. Run `kubectl port-forward -n egov <dependency> <port>:8080` for each dependency.
2. In `application.properties`, point the `*.host` properties (`egov.mdms.host`, `egov.user.host`, `egov.workflow.host`, …) and `spring.datasource.url` / `spring.flyway.url` at them.

## Architecture conventions (DIGIT pattern)

- **Request/response envelope**: every API is a `POST` with a `RequestInfo` wrapper (auth token + `userInfo`) and returns `ResponseInfo`. Endpoints are named `_create`, `_update` and `_search`.
- **Layering**: `web/controllers` → `validator` → `service` (enrichment, workflow call, business logic) → `producer` (Kafka). Reads go through `repository` with a `querybuilder` and a `rowmapper`.
- **Writes are async via egov-persister**: services usually don't write to the database directly. They publish to a Kafka topic, and the persister writes using the service's persister YAML. `*-indexer` topics feed Elasticsearch. When you add a DB column, update the Flyway migration, persister YAML, row mapper and query builder together.
- **State transitions** go through **egov-workflow-v2**. Roles and actions come from workflow and MDMS.
- **Master data** comes from **MDMS v2** at runtime. Don't hard-code values that MDMS provides.
- **DB migrations**: Flyway, in `src/main/resources/db/migration/main` (SQL). im-services also has Java migrations in `src/main/java/db/migration/main`. Name files `V<yyyyMMddHHmmss>__desc` (rms-service uses sequential `V<n>__`; follow the service's existing style). In deployment, where present, they run with `outOfOrder=true` from a separate `<service>-db` image (`src/main/resources/db/Dockerfile` + `migrate.sh`), so a new migration must not depend on strict version ordering.

## Working efficiently

- Never read `target/`, `*.jar`, or `.docx`/`.xlsx`/`.png` files in `docs/`. Don't scan across services; go straight to the service directory and grep.
- Before using a Java/Spring API, check that service's `pom.xml` (legacy services are Java 8 / `javax.*`).
