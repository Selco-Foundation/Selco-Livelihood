# Livelihood UI Module Template

Create new domain modules under `src/modules/<module-name>/` following the same internal layout used by DIGIT modules (e.g. `installation-ui/.../qc`).

## Folder structure

```
src/modules/<module-name>/
├── index.ts              # exports create<Module>Module(rootRoute, employeeLayoutRoute?)
├── constants/
│   └── routes.ts
├── pages/
│   └── employee/
├── components/
├── hooks/
├── services/
└── types/
```

## Module contract

Export a `create<Module>Module(rootRoute, employeeLayoutRoute?)` function that returns:

```ts
{
  id: "<module-id>",
  order?: number,
  routes: AnyRoute[],
  navItems: NavItem[],
  overview?: ComponentType,
}
```

- **`order`**: optional sort order for overview sections and sidebar nav aggregation
- **`overview`**: a single component rendered on the employee home page for this module — it owns its whole section (stat tiles, lists, etc.), not just a single card. Compose it from `StatTile` (`@/ui`) for standalone KPI tiles plus any module-specific content (e.g. IM's `EndUserAssetsList`)
- **`employeeLayoutRoute`**: pass the route from `createCoreModule()` so module pages render inside `AppShell`

Use `@/shared` for API (`apiClient`), react-query, zustand, and config helpers.
Use `@/ui` for shadcn components and `DataTable` for TanStack Table compositions.

## Register the module

Import and register in `src/modules.ts`:

```ts
import { createCoreModule } from "@/modules/core";
import { createImModule } from "@/modules/im";
import { setRegisteredModules } from "./module-registry";

const core = createCoreModule(rootRoute);
const im = createImModule(rootRoute, core.employeeLayoutRoute);

const enabledModules = [core, im];
setRegisteredModules(enabledModules);
```

`module-registry.ts` aggregates `navItems` for `AppShell` and `overview` for `HomePage`.

## Routing conventions

- Employee routes live under `/{contextPath}/employee/...`
- Use `contextPath()` from `@/shared` when building route paths
- Nest protected routes under `core.employeeLayoutRoute` so they share the authenticated shell
- Add `beforeLoad` auth checks on protected routes (see `src/modules/core/routes.tsx`)

## Services

Place API calls in `services/` using the shared axios client:

```ts
import { apiClient } from "@/shared";

export async function searchItems() {
  const { data } = await apiClient.post("/your-service/v1/_search", { /* ... */ });
  return data;
}
```

Pair services with react-query hooks in `hooks/`.

## Localization

Load module-specific DIGIT locale bundles when the module mounts:

```ts
import { loadModules } from "@/shared";

await loadModules(["rainmaker-im"]);
```

## Dev proxy

Add new API path prefixes to `src/config/proxy-paths.ts` for local Vite proxying.
