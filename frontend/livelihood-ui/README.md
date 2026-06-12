# Livelihood UI

Custom React app for the Livelihood product. Built with Vite, TypeScript, pnpm, TanStack Router, React Query, Zustand, shadcn/ui, and Tailwind CSS.

## Prerequisites

- **Node.js 24+** (see `.nvmrc`)
- **pnpm 10+** (via Corepack — not a separate apt install)

## First-time setup (pnpm not found)

If `pnpm` is missing, use **nvm + Corepack** (do not use `sudo apt install pnpm`):

```bash
# Load nvm (add to ~/.bashrc if this fails in new terminals)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

nvm install 24
nvm use 24
corepack enable
corepack prepare pnpm@10.12.1 --activate

node -v   # must show v24.x
pnpm -v   # must show 10.12.1
```

**Important:** Node 24 must be first on your `PATH`. If `node -v` still shows v22 after `nvm use 24`, run:

```bash
export PATH="$HOME/.nvm/versions/node/$(cat .nvmrc).x/bin:$PATH"
# or explicitly:
export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
```

## Quick start

```bash
cd frontend/livelihood-ui
nvm use
pnpm install
cp .env.sample .env
pnpm dev
```

Open [http://localhost:5173/livelihood-ui/](http://localhost:5173/livelihood-ui/).

## UI components (shadcn)

Components live in `src/ui` and are installed via the **official shadcn CLI**:

```bash
pnpm ui:add select textarea checkbox -y -o
```

## App layout

```
livelihood-ui/
├── src/
│   ├── main.tsx, App.tsx, router.tsx, modules.ts
│   ├── shared/          # API, stores, config, analytics
│   ├── ui/              # shadcn components + Tailwind
│   └── modules/
│       ├── core/        # Auth + shell layout
│       └── MODULE_TEMPLATE.md
├── public/
└── docker/
```

## Environment variables

Copy `.env.sample` to `.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_PROXY_API` | DIGIT/E4H API proxy target for local dev |
| `VITE_STATE_LEVEL_TENANT_ID` | Default tenant id |
| `VITE_GLOBAL_CONFIG_URL` | Remote `globalConfigs.js` script (optional) |
| `VITE_GA_ID` | Google Analytics measurement id |

## Global config

Runtime config uses `window.globalConfigs.getConfig("KEY")`, same as other DIGIT UIs. Local dev loads `public/sampleGlobalConfig.js` by default.

## Adding modules

See [src/modules/MODULE_TEMPLATE.md](src/modules/MODULE_TEMPLATE.md).

## Docker

```bash
docker build -f docker/Dockerfile --build-arg WORK_DIR=. -t livelihood-ui .
```

The image serves the SPA from `/var/web/livelihood-ui` behind nginx with context-path support.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Typecheck and build production bundle |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm ui:add` | Add shadcn components |
