# Ingestion Service

A [uv](https://docs.astral.sh/uv/) managed python project for various ingestion driven processes in Asset Management.

# Installation

Install uv from https://docs.astral.sh/uv/ and run `uv sync` from root folder (folder with uv.lock file).

# Running the program

1. Ensure that .env has the right values.
2. Port Forward the relevant services from kubectl
3. Run `uv run -m app.main` from root folder.

# Boundary ingestion

Two endpoints, both taking the same workbook (sheet `Boundary Data`, columns
`Country, State, District, Block`):

| Endpoint | Writes? |
|---|---|
| `POST /ingestion-service/ingest/boundariesValidateData` | no — dry run |
| `POST /ingestion-service/ingest/boundaries` | yes |

Both return the workbook annotated with a `status` and `error` per row. Validate
reports `fail`, `skipped`, `exists` or `would_create`; ingest reports `fail`,
`skipped`, `exists` or `success`.

Validate first, fix the sheet if it reports errors, then ingest — the same
two-step flow as `/facilities` and `/assets`.

`/boundaries` is unchanged by the validate endpoint and keeps the validators it
has always had. The extra name-collision check (one name used under two different
parents in a sheet, which a real ingestion drops silently) runs **only** in
validate, via `BoundaryValidationProcessor`. Ingestion behaviour is untouched.
