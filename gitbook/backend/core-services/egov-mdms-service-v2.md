# eGov MDMS Service v2

`backend/core-services/egov-mdms-service-v2`

## What it does

The tenant-scoped master data service. Livelihood uses it to host the Solution Repository (equipment bundles tagged by sector and sunshine-hour suitability), issue types, SLA/escalation configuration, and RMS's district ticket-creation allowlist.

## Documentation note

This service's folder has no `README.md` at all — only build artifacts (`pom.xml`, `src/`, `target/`). This page's description is grounded entirely in how other services and modules describe consuming MDMS elsewhere in this documentation and codebase, not in the service's own documentation, because none exists.

## Where to look

- The service's own generic `_search` API (`POST /mdms-v2/v1/_search`), used throughout the platform.
