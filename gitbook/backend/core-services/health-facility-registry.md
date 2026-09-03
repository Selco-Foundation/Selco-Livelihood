# Health Facility Registry

`backend/core-services/health-facility-registry`

## What it does

Owns facility (end-user site) master data — creating, updating, and searching facilities individually or in bulk, plus facility assessment APIs. Every other service in the platform references facilities by ID only, never by name.

## Documentation note

The service's own `README.md` is a generic swagger-codegen server stub (it documents how the stub was generated, not what the service does). A fuller, service-specific API description exists separately at `docs/facility-registry/facility-v2-api.yaml` (OpenAPI 3.1), which this page's description draws on.

## Where to look

- `backend/core-services/health-facility-registry/README.md`
- `docs/facility-registry/facility-v2-api.yaml` — the actual OpenAPI contract, including create/update/search and assessment endpoints.
