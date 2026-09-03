# Platform Overview

Livelihood is SELCO Foundation's platform for planning, installing, and supporting solar-powered livelihood equipment — pulverizers, cold storage units, looms, and similar machines — at end-user sites across India. It coordinates the full lifecycle of a program: assessing whether a site qualifies, planning and executing installations, handing installed equipment over to operations, and running ongoing support (ticketing) and impact reporting (CO₂ emissions avoided) once equipment is live.

## Core concepts

A small set of entities recur across every module:

| Concept | What it is |
| --- | --- |
| **Project** | A funded program of work, often spanning multiple states, created against a justification code. |
| **Facility (End User Site)** | The physical location where equipment is or will be installed. Every facility belongs to a project. |
| **Asset** | An individual piece of installed equipment (solar system, machine) at a facility. Assets are the unit of vendor assignment, warranty tracking, and support-ticket routing. |
| **Assessment Plan** | A pre-installation screening cycle that determines which facilities are eligible to proceed to installation. |
| **Installation Plan** | The operational plan that schedules and tracks installation of Solutions (equipment bundles) at eligible facilities. |
| **Vendor Organisation** | The installation or maintenance contractor assigned to a facility's assets. |
| **Facility Manager / End User** | The person operating the facility — the complainant on any support ticket raised for that site's assets. |
| **Program POC** | A state-scoped program staff member who oversees tickets and installation activity across their assigned geography. |

## Program lifecycle, end to end

1. **Assessment** — a facility is phone-assessed and, if warranted, field-assessed, and marked eligible or ineligible for installation.
2. **Project & Plan setup** — a Project Manager creates a Project, scopes it to eligible end-user sites, and creates an Installation Plan against those sites.
3. **Vendor assignment & templating** — the Project Manager assigns a Vendor Organisation to each site's Machine and Solar components, and configures the Installation Template (bill-of-materials expected at each site).
4. **Installation & reporting** — a vendor's Field Technician installs the equipment and files an Installation Completion (IC) Report from the field, with photo/video evidence and an OTP-verified sign-off from the site.
5. **Review** — an Installation Reviewer approves or rejects the report per component (Machine, Solar).
6. **Handoff** — approved components create/activate Asset records, ready for operations and support.
7. **Support** — once live, the facility manager (or a Program POC on their behalf) can raise a support ticket against a specific asset; it auto-assigns to that asset's vendor and moves through a defined workflow with SLAs.
8. **Monitoring & reporting (where applicable)** — Remote Monitoring (RMS) can auto-raise tickets from telemetry and CO₂-avoidance figures are computed for solar-connected sites.

## Who's who

| Role | Primary responsibility |
| --- | --- |
| Super Admin / Organisation POC / Vendor POC | Platform, organisation, and vendor-org administration |
| Project Manager | Creates Projects and Installation Plans, assigns vendors and reviewers |
| Field Technician (Installation SPOC) | Performs installation, submits IC Reports |
| Installation Reviewer | Approves/rejects submitted IC Reports |
| Program POC | State-scoped oversight of tickets and installation progress |
| Facility Manager (End User) | Raises support tickets for their site's assets |
| Vendor | Resolves support tickets for the assets they installed |
| CRM user | Manages RMS-driven automatic ticket creation (pause/resume) |

For how these pieces map onto actual services, see [Architecture at a Glance](architecture.md).
