# Livelihood UI

`frontend/livelihood-ui`

## What it is

The primary Livelihood-specific web app — serving facility managers, Program POCs, vendors, and Admin-module users. Unlike `installation-ui`, it is a standalone modern stack, not built on `micro-ui`: Vite, TypeScript, pnpm, TanStack Router, React Query, Zustand, shadcn/ui, and Tailwind CSS.

## Local setup essentials

- Requires **Node.js 24+** (see its `.nvmrc`) and **pnpm 10+** via Corepack — not a separate `apt install pnpm`.
- If `pnpm` is missing: load `nvm`, `nvm install 24 && nvm use 24`, then `corepack enable && corepack prepare pnpm@10.12.1 --activate`.
- Node 24 must be first on `PATH` — if `node -v` still shows an older version after `nvm use 24`, the README documents an explicit `PATH` export as a workaround.

## Where to look

- `frontend/livelihood-ui/README.md` for the full, current setup steps.
- [Frontend setup](../getting-started/frontend-setup.md).
