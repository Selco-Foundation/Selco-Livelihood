# AMC Scheduler Service

`backend/e4h-services/amc-scheduler-service`

## What it does

Owns scheduled/cron jobs — including AMC (annual maintenance contract) visit scheduling and the OTP client pattern that Installation's IC Report submission reuses for site acknowledgment. AMC visit scheduling itself is out of scope for Livelihood; Installation reuses only the scheduling/OTP machinery.

## Documentation note

This service's `README.md` is a generic, unedited "Project Service" description ("Project registry is a Health Campaign Service...") — it does not describe this service's actual purpose. This page's description instead draws on how the service is used elsewhere in this documentation ([LLDs → Installation](../../LLDs/installation/README.md), [Workflows and crons](../workflows-and-crons.md)).

## Where to look

- `backend/e4h-services/amc-scheduler-service/LOCALSETUP.md`, if present, for local bring-up.
