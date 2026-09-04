# Selco Livelihood

![Livelihood equipment in operation](.gitbook/assets/livelihood-cover.jpg)

Selco Livelihood is SELCO Foundation's platform for planning, installing, and supporting solar-powered livelihood equipment — pulverizers, cold storage units, looms, and similar machines — at end-user sites across India. It coordinates a program's full lifecycle: screening candidate sites, planning and executing installations, handing installed equipment over to operations, and running ongoing support and impact reporting once that equipment is live.

## How this documentation works

This GitBook is generated directly from the `gitbook/` folder in the repository, driven by two files at the repository root and inside that folder:

- **`.gitbook.yaml`** (repo root) tells GitBook where the documentation lives and which files anchor it — it points `root` at `./gitbook` and names `README.md` and `SUMMARY.md` as the landing page and table of contents.
- **`README.md`** (this page) is the landing page readers see first.
- **`SUMMARY.md`** is the table of contents — every page in the sidebar is a link listed there, nested to show how sections relate. A page not linked from `SUMMARY.md` will not appear in the published GitBook, even if the file exists.

## Repository areas

- **`backend/core-services/`** — the shared DIGIT platform backbone services vendored into this repo (workflow engine, master data, file storage, ID generation, notifications, boundary/geography, the health-facility-registry, and the Zuul gateway).
- **`backend/e4h-services/`** — the domain services Livelihood builds on and extends (facility/asset/vendor registries, project service, field-planner and field-planner-activity for installation, incident management, RMS, ingestion, HRMS, and supporting services).
- **`frontend/`** — the web applications: `micro-ui` (the shared module framework), `installation-ui` (installation planning and review), and `livelihood-ui` (the primary Livelihood-specific app).
- **`docs/`** — service-specific reference material (API specs, LLDs) maintained alongside individual services.
- **`Z_docs/`** — design-in-progress documents (LLDs, PRDs, schema dumps) that this GitBook draws on and consolidates into a more navigable, review-ready form.

## GitBook publishing flow

1. Content is authored and reviewed as Markdown inside `gitbook/`, in the same pull requests as the code it documents.
2. `SUMMARY.md` is updated whenever a page is added, moved, or removed, so the table of contents always matches what actually exists on disk.
3. The GitBook integration reads `.gitbook.yaml` from the repository root, resolves `root: ./gitbook`, and builds the site from `README.md` and `SUMMARY.md` found there.
4. Pushes to the tracked branch sync automatically to the published GitBook space; broken links or missing files surface as build issues rather than failing silently.

## Start here

- **[Platform overview](overview/platform-overview.md)** — what the platform does and who uses it.
- **[Architecture](overview/architecture.md)** — how the services, frontends, and platform backbone fit together.
- **[Local setup](getting-started/local-setup.md)** — bringing up a development environment.
- **[LLDs](LLDs/installation/README.md)** — low-level design documentation per module, including known gaps and open questions.

Several pages in this documentation call out design that is still open, contested, or only partially implemented as a **known limitation** or **in progress**, rather than describing it as finished — this is deliberate, so the docs stay a trustworthy record of the platform's actual current state.
