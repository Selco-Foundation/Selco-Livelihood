# Boundary service

`backend/core-services/boundary-service`

## What it does

Owns the geography master data (state/district/block hierarchy) that facility, vendor, asset, and RMS services all consume rather than re-implementing their own boundary logic — for example, RMS's district-level ticket-creation gating resolves its allowlist through this service.

## Documentation note

The service's own `README.md` is a generic swagger-codegen server stub (it documents how the stub was generated, not what the service does) — this page's description is grounded in how the service is used elsewhere across the platform, not in its own README.

## Where to look

- `backend/core-services/boundary-service/README.md`
- Its own Swagger UI, once running, for the exact endpoint contract.
