# Master data

Master data in the platform is served by `egov-mdms-service-v2` (see [Backend → Core services → eGov MDMS Service v2](../backend/core-services/egov-mdms-service-v2.md)) — a generic, tenant-scoped JSON master data service used across every module rather than per-module configuration tables.

## What Livelihood stores as master data

- **Solution Repository** (`Installation.Solution`) — equipment bundles tagged by sector and sunshine-hour suitability, queried via `POST /mdms-v2/v1/_search` with `moduleName: "Installation"`, `masterName: "Solution"`. See [LLDs → Installation → Data model](../LLDs/installation/data-model.md).
- **Issue types and SLA/escalation configuration** for the support-ticket workflow — see [LLDs → Livelihood core](../LLDs/livelihood-core/README.md).
- **RMS district ticket-creation allowlist** (`DistrictTicketCreationAllowlist`, module `rms-service`) — a state code, district boundary code, district name, and active flag per row; an empty list disables district gating rather than blocking everything. See [LLDs → RMS → Gating and pause](../LLDs/rms/gating-and-pause.md).

## Facility master data

Facility (end-user site) master data is owned separately, by the facility registry service, not MDMS — see [Backend → Core services → Health Facility Registry](../backend/core-services/health-facility-registry.md) and its OpenAPI contract at `docs/facility-registry/facility-v2-api.yaml`. Boundary/geography master data (state/district/block) is likewise owned by `boundary-service`, not MDMS, and is consumed by facility, vendor, asset, and RMS services alike.

## Why this split matters

A useful distinction when adding new configuration: if it's tenant-scoped, JSON-shaped, and doesn't need its own relational schema or query semantics, it likely belongs in MDMS as a new master; if it needs its own relational structure, indexed search, or high write volume, it belongs in a domain service's own table instead, following the additive-migration pattern described in [Schemas](schemas.md).
