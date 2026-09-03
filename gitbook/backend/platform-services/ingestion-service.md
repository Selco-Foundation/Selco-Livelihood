# Ingestion Service

`backend/e4h-services/ingestion-service`

## What it does

The platform's only Python service, managed with [`uv`](https://docs.astral.sh/uv/). Handles bulk Excel-based data loading and export across the platform — facilities, assets, vendors, boundaries, installation templates, and assessment exports all round-trip through this one engine rather than a bespoke import path per module.

## Where to look

- `backend/e4h-services/ingestion-service/README.md` for local run instructions (`uv sync`, then `uv run -m app.main`).
