# eGov HRMS

`backend/e4h-services/egov-hrms`

## What it does

Manages every employee-style user enrolled in the system — creating, updating, and searching employees with attributes like assignments, service history, and jurisdiction. Can be treated as a subset of `egov-user`: every employee created through HRMS is also created as a user in `egov-user`. In Livelihood, every staff-style user (facility manager, Program POC, vendor staff, Installation Reviewer) is provisioned here. Depends on `egov-user`, `egov-localization`, `egov-idgen`, `egov-mdms`, and `egov-filestore`.

## Where to look

- `backend/e4h-services/egov-hrms/README.md`
