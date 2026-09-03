# Frontend setup

Each frontend app has its own `README.md` with exact setup steps — this page is a conceptual pointer, not a substitute.

- `frontend/livelihood-ui/README.md` — the primary Livelihood-specific app. Built with Vite, TypeScript, pnpm, TanStack Router, React Query, Zustand, shadcn/ui, and Tailwind CSS. Requires Node.js 24+ (see its `.nvmrc`) and pnpm 10+ via Corepack.
- `frontend/installation-ui/README.md` — the installation planning/review app, a React app built on DIGIT UI Core.
- `frontend/micro-ui/README.md` — the shared DIGIT UI Core module framework the other two apps are built from; run its dev server directly when working on shared modules.

## General shape

1. Install the Node/package-manager toolchain each app's own README specifies (versions differ between `livelihood-ui` and the DIGIT UI Core–based apps — follow each app's README rather than assuming one toolchain fits all).
2. Install dependencies (`pnpm install` for `livelihood-ui`; check each app's README for the others).
3. Point the app's local environment configuration at your running backend (see [Backend setup](backend-setup.md)) — exact environment variable names and values are not reproduced here; follow the app's own README and any example env file it ships.
4. Start the dev server as documented in that app's README.

No secrets or credential values are reproduced in this documentation.
