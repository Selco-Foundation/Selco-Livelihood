# IM Services Analytics

`backend/e4h-services/im-services-analytics`

## What it does

Runs the monthly batch CO₂-emissions-avoided computation (`carbon-emission-calculate` topic), looping over visibility-flagged facilities and lifecycle months, publishing actual/projection results for indexing.

## Documentation note

The service's own `README.md` is a generic swagger-codegen server stub with no service-specific detail. This page's description is grounded in [LLDs → RMS → CO2 calculation](../../LLDs/rms/co2-calculation.md) instead.

## Where to look

- [LLDs → RMS](../../LLDs/rms/README.md) for the full calculation this service performs.
