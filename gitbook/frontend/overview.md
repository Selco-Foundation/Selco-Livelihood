# Frontend overview

The platform ships three frontend applications, each serving a different audience but sharing the same backend and, for two of them, the same underlying module framework.

| App | Audience | Built on |
|---|---|---|
| `livelihood-ui` | Facility managers, Program POCs, vendors, Admin-module users | A modern standalone React/Vite/TypeScript stack (pnpm, TanStack Router, React Query, Zustand, shadcn/ui) — the primary Livelihood-specific frontend, not built on `micro-ui`. |
| `installation-ui` | Project Managers, Installation Reviewers, Field Technicians | DIGIT UI Core, via `micro-ui` — the installation planning, execution, and review journeys. |
| `micro-ui` | Shared framework | The DIGIT UI Core module framework `installation-ui` and platform-standard admin/workbench screens are built from. |

See [Micro UI](micro-ui.md), [Installation UI](installation-ui.md), and [Livelihood UI](livelihood-ui.md) for detail on each, and [Modules and dependencies](modules-and-dependencies.md) for how they relate.
