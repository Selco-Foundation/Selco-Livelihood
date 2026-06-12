# Livelihood UI Module Template

Create new domain modules under `src/modules/<module-name>/` following the same internal layout used by DIGIT modules (e.g. `installation-ui/.../qc`).

## Folder structure

```
src/modules/<module-name>/
├── index.ts              # exports create<Module>Module(rootRoute)
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

Export a `create<Module>Module(rootRoute)` function that returns:

```ts
{
  id: "<module-id>",
  routes: AnyRoute[],
  navItems: NavItem[],
}
```

Use `@/shared` for API (`apiClient`), react-query, zustand, and config helpers.
Use `@/ui` for shadcn components and `DataTable` for TanStack Table compositions.

## Register the module

Import and register in `src/modules.ts`:

```ts
import { createExampleModule } from "@/modules/example";

const enabledModules = [
  createCoreModule(rootRoute),
  createExampleModule(rootRoute),
];
```

## Routing conventions

- Employee routes live under `/{contextPath}/employee/...`
- Use `contextPath()` from `@/shared` when building route paths
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
