# RMS Service

`backend/e4h-services/rms-service`

## What it does

The Remote Monitoring System service: collects telemetry from RMS devices (solar panel, inverter, battery, grid), applies anomaly-detection rules, de-duplicates against tickets already raised, and — when a genuine new issue is detected — auto-creates a support ticket in the incident-management (`im-services`) service. Also implements district-level ticket-creation gating and per-facility ticket pause.

## Where to look

- `backend/e4h-services/rms-service/README.md` and `README-TESTING.md`
- [LLDs → RMS](../../LLDs/rms/README.md) for the full design.
