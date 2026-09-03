# Asset Registry

`backend/e4h-services/asset-registry`

## What it does

Owns assets (installed equipment) — per-asset vendor mapping, warranty, and per-asset O&M (operations & maintenance) eligibility. Assets are the unit that support tickets and Installation's asset-handoff step both key off; every support ticket carries an asset ID, and the platform validates the asset actually belongs to the stated facility before proceeding.

## Documentation note

The service's own `README.md` is a generic swagger-codegen server stub with no service-specific detail. This page's description is grounded in how the service is used elsewhere in this documentation ([LLDs → Livelihood core](../../LLDs/livelihood-core/README.md), [LLDs → Installation → Data model](../../LLDs/installation/data-model.md)).

## Where to look

- `docs/asset-registry/asset-registry-1.0.0.yaml` — the OpenAPI contract.
