# eGov IDGen

`backend/core-services/egov-idgen`

## What it does

Generates new IDs based on configured ID formats, exposed via a REST API that takes a format request and returns the generated ID. Depends on `egov-mdms-service`. Livelihood uses it for human-readable identifiers — Project numbers, Installation Plan IDs, IC Report numbers, and ticket IDs.

## Where to look

- `backend/core-services/egov-idgen/README.md`
- Its Swagger API contract (linked from the README).
