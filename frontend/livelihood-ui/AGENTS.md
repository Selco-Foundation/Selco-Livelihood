# Agent instructions — livelihood-ui

Read this before making changes in this project. It captures conventions that
aren't obvious from the code alone, so any agent (Claude or otherwise) working
here later stays consistent with what's already been built.

## Stack

Vite + React, TanStack Router (code-based route registration, not file-based),
TanStack Query, Zustand, Tailwind v4, shadcn/ui on top of radix-ui. `pnpm` is
the package manager. No ESLint is configured yet — `tsc --noEmit` (via `pnpm
typecheck` or `pnpm build`) is the only automated check, so run it after every
change.

## Module boundaries — never cross them

The codebase is layered into three kinds of code, and the dependency
direction only goes one way:

- **`@/ui`** — shared, presentational components. May depend on `@/shared`.
  Must never import from `@/modules/*`.
- **`@/shared`** — state stores, i18n, API client, cross-cutting types.
- **`@/modules/*`** (e.g. `core`, `im`, `ir`) — feature modules. May depend on
  `@/ui` and `@/shared`. **Must never import from another module** —
  `@/modules/im` importing something from `@/modules/ir` (or vice versa) is
  not allowed, ever, even for something that looks small or one-off. If two
  modules need the same thing, that thing belongs in `@/ui` or `@/shared`,
  not duplicated and not cross-imported.

Before adding an import, check which of these three buckets both the
importer and the imported file live in.

## Module composition pattern

Each feature module exports a `createXModule(rootRoute, employeeLayoutRoute)`
factory (see `src/modules/ir/routes.tsx`, `src/modules/im/routes.tsx`) that
returns:

```ts
{ id, order, routes, navItems, overview? }
```

- `overview` is `{ kpis?, details?, actions? }` — three optional component
  slots rendered on the shared home page (`HomePage.tsx` via
  `getModuleOverviews()`). Not every module needs all three, or any.
- `navItems` entries may carry an optional `roles?: string[]` — omit it for
  an item visible to everyone (e.g. core's "Overview"); set it to hide the
  item unless the signed-in user holds one of those role codes.
  `getModuleNavItems(userRoles)` in `src/module-registry.ts` does the
  filtering. Each module owns its own role list in its `utils/access.ts`
  (e.g. `IR_ROLES`, `IM_ROLES`) and exports it for this purpose — don't
  hardcode role codes elsewhere or import one module's role list from
  another module's component.
- A component that should only be visible to certain roles (KPI, detail
  section, page, nav item, whatever) checks access itself and returns `null`
  — see `hasIrAccess`/`hasImAccess` and their usage in each module's pages
  and overview components. Don't assume a parent will hide it for you: a
  parent often can't know that without violating the no-cross-module-import
  rule.
- `core`'s module has `order: 0`, empty `navItems`, and no `overview` by
  design (it owns the shell/login/home routes, not a feature surface) —
  don't treat that as a bug.

## Components

- **shadcn-first**: before hand-building a UI primitive, check whether
  `pnpm ui:add <component>` (shadcn CLI) already covers it. If the stack is
  missing a component you need, say so and ask before installing — don't
  silently add a new dependency, and don't hand-roll something shadcn already
  provides. Hand-rolled one-offs (e.g. `split-button`) live in
  `src/ui/components/`, not inside `src/ui/components/ui/` — that folder is
  reserved for pure shadcn CLI output so it stays swappable/upgradable.
- **reui is a secondary CLI registry**, declared separately in
  `components.json`'s `registries.@reui` — components sourced from it (e.g.
  `stepper`) are built on `@base-ui/react` rather than `radix-ui`, and live in
  their own `src/ui/components/reui/`, not `src/ui/components/ui/` (that
  folder is shadcn-only). Installing a new one needs manual fix-up every
  time — neither quirk below is fixable via `components.json`, confirmed
  against the shadcn CLI's own source
  (`packages/shadcn/src/utils/updaters/update-files.ts`): a registry item's
  own `target` field is resolved as a literal path and never consults
  `components.json`'s `aliases`, so a local alias override has no effect once
  an item sets one.
  1. `pnpm dlx shadcn@latest add @reui/<name> --path src/ui/components/reui`
     — the `--path` flag is required; it's checked before the item's own
     `target` and is the only thing that reliably overrides it.
  2. Fix the generated file's `import { cn } from "cn"` to
     `import { cn } from "@/ui/lib/utils"`, and remove the `cn` package from
     `package.json` if nothing else still uses it.
  3. Add the new component's exports to `src/ui/index.ts` by hand — nothing
     does this automatically, unlike components installed by the shadcn CLI
     itself landing where `aliases.ui` already points.
- Prefer composing existing `@/ui` components over new bespoke ones.
- Radix primitives can be imported directly (`import { Accordion as
  AccordionPrimitive } from "radix-ui"`) when a shared wrapper component's
  behavior doesn't fit (e.g. a custom accordion header needs a second
  clickable control beside the trigger, which the shared `AccordionTrigger`
  doesn't support since it makes the whole header one clickable region).

## State

Use Zustand only for state that's genuinely global (auth, jurisdiction, etc.
— see `src/shared/stores`). Don't add a module-local store as a default
pattern; local component state or TanStack Query's cache is usually enough.

## Services and hooks

A service function does exactly one thing: take the criteria/params the
caller passes in, make one HTTP call, and return the response exactly as the
backend sent it back — no calling another service function from inside a
service function, no reshaping the response into a domain type, no
synthesizing a response that isn't what the backend actually returned. See
`searchActivityFacilities`/`bulkUpdateActivityFacilitiesWorkflow` in
`src/modules/ir/services/facility.ts` for the shape to match: `(criteria,
options?, accessToken, user?) => Promise<RawBackendResponse>`.

Everything else — building the right criteria object for a specific use case,
mapping a raw response into the domain type components render, sequencing
multiple calls that depend on each other, react-query wiring (`queryKey`,
`enabled`, cache invalidation) — belongs in the **hook** that calls the
service, not the service itself. A hook's `queryFn`/`mutationFn` is allowed to
call more than one service function and to call mapper functions; a service
file's own exports are not.

Pure mapping/shaping functions (a raw API row → our domain type, or several
raw responses → one assembled view model) live in `utils/*.ts`, not in
`services/*.ts` and not inlined in the hook — see
`toFacilityEntry`/`toInstallationPlan` in `src/modules/ir/utils/` (simple
one-row mappers) and `buildFacilityReviewDetail`/`buildWorkflowDetailsData`
(bigger, multi-source mappers) for the pattern. `services/*.ts` should contain
nothing but functions that make an HTTP call, plus request-body types.

When you're about to write a `fetch`/`search`/`update` call to render or
mutate data in the UI, default to putting it behind a custom hook structured
this way. If a direct service call from a component seems to make more sense
for some case, raise it and discuss before doing it — don't decide that
unilaterally.

## Backend not ready yet: hardcode it, don't fake an abstraction

Two different situations, two different places to hardcode:

- A whole endpoint doesn't exist yet: the service function you'd otherwise
  write returns static/derived data instead of calling `apiClient`, with a
  doc comment marking the future real-endpoint swap-over point. The swap is
  meant to be a one-line change inside that function, not a structural
  rewrite.
- One specific option list/master doesn't have a real MDMS master yet (a
  dropdown's choices, not a whole feature): hardcode it as its own file under
  `constants/`, not inside a service. These aren't network calls at all, so
  they don't belong in `services/`; a hook that would otherwise fetch the
  master just imports the constant directly instead. Once a real master
  exists, migrate it to the MDMS-backed hook pattern below and delete the
  constant — don't leave both around.

## Fetching an MDMS master once it's real

One hook per master, matching `hooks/use-rejection-reason-options.ts`,
`hooks/use-installation-image-criteria.ts`, and
`hooks/use-installation-type-options.ts`:

```ts
const { data } = useQuery({
  queryKey: ["ir-<master>-options", tenantId],
  enabled: Boolean(accessToken),
  staleTime: 5 * 60_000,
  queryFn: () => fetchMdmsMasters(tenantId, moduleCode, [masterName], accessToken!, user),
});
```

`fetchMdmsMasters` (`@/shared`) returns `Record<string, unknown[]>` keyed by
master name — read the raw rows off `data?.<MasterName>`, then map them to
whatever shape the caller actually needs (an `ActivityFilterOption[]`, a
lookup by code, etc.) in the same hook, same as any other raw-response
mapping. Prefer an existing translated label (e.g. `COMPONENT_TYPE_LABELS`)
over the master's own `name` field when one already exists elsewhere in the
app for that code, so the option list and wherever else the value is
displayed don't drift out of sync — fall back to the master's `name` only
for a code that doesn't have one yet.

## Confirming irreversible actions

Any action that can't be undone (approve/reject a report, delete something,
bulk-approve) should go through a confirmation step using shadcn's
`AlertDialog` (not `Dialog`) — see `ConfirmActionDialog.tsx` and
`ConfirmBulkApproveDialog.tsx` in the `ir` module for the pattern.

## Feedback after a mutation

Show the result with a toast (`toast` from `@/ui`, sonner under the hood) —
`toast.success(...)` when it fully succeeded, `toast.error(...)` when it
failed, `toast.warning(...)` for a partial outcome (e.g. a bulk action where
some items failed and some didn't — see `runBulkApprove` in
`ActivityList.tsx`). For an error toast's description, prefer
`extractApiErrorMessage(error)` (`@/shared`) and fall back to the
`ES_SOMETHING_WRONG` key ("Something went wrong. Please try again.") when it
can't extract anything more specific — see `ProfilePage.tsx`,
`ChangePasswordPage.tsx`, or `ActivityList.tsx`'s `runBulkApprove` for the
exact shape:

```ts
onError: (error) => {
  toast.error(translateOr(t, "SOME_ACTION_FAILED_KEY", "Fallback failure message"), {
    description:
      extractApiErrorMessage(error) ??
      translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again."),
  });
},
```

## Layout: respect `SidebarInset`'s box

`AppShell.tsx`'s `SidebarInset` owns the page's rounded corner and padding,
and is the scroll container for page content by default. A "pinned footer"
or similar page-level fixed element should stay a normal in-flow child
inside that box (e.g. a flex column with an inner `overflow-y-auto` region
and the footer as a sibling below it), not `position: fixed` — `fixed`
escapes `SidebarInset`'s padding/corner entirely and has to re-derive its
horizontal bounds by hand (via the `--sidebar-width` CSS var), which breaks
the rounded corner and is brittle across breakpoints. `position: sticky`
inside `SidebarInset` also doesn't work as expected because `SidebarInset`
itself is a flex column, not a plain scrolling block — a nested flex
column with its own inner scroll region is the reliable pattern.

## Localization (i18next)

Keys are split by which `rainmaker-*` module the app loads them from:
- `rainmaker-{moduleCode}` (e.g. `rainmaker-ir`, `rainmaker-im`) — needed
  only within that one module.
- `rainmaker-common` — needed across multiple modules (generic actions like
  Cancel/Confirm/Save, not module-specific copy). Prefer reusing an existing
  common key over inventing a near-duplicate — e.g. reuse `CORE_COMMON_CANCEL`
  rather than adding a second "Cancel" key. Check for an existing key with
  the same fallback text before creating a new one.
- `rainmaker-livelihood` — currently holds boundary (district/block/etc.)
  data only.

**Every module always loads `rainmaker-common` too** (see
`getDefaultLocalizationModules` in `src/shared/i18n/locale-utils.ts`), so a
key genuinely shared across modules must live in `rainmaker-common` — a key
that only exists in one module's own bundle won't resolve for another
module's `translateOr` calls.

**Rendering rules:**
- Wrap every user-facing string in `translateOr(t, "KEY", "Fallback")` —
  except a literal inside a framework step-config object that resolves keys
  internally on its own (check for that pattern before assuming it applies).
- **Never** pass raw/non-key data through the translation function — dates,
  timestamps, free text, plain numbers. i18next's default namespace
  separator is `:`, so a raw string containing a colon (e.g. a time like
  `"19:02"`) gets silently mangled into just `"02"`. This has caused a real
  production bug before.
- For MDMS/master-data-driven display values from a finite enum-style
  vocabulary (dropdown/select/radio option names) that could become real
  keys later: still route through `translateOr`, but only the curated
  option-name field, tagged explicitly at the point it's resolved (e.g. a
  `labelKey` alongside the display value) — never assume "it came from
  master data" alone makes a field safe to translate. Free-text, date, or
  numeric fields from that same master data must render as-is, untranslated.

**Staging new keys**: this project has no shared, code-committed
localization file. Each developer keeps a personal git-tracked "staging"
file for new keys, outside this repo, later copied into the team's real
localization service by whatever process the team uses. If you introduce a
new key, locate the developer's tracking repo via the
`LIVELIHOOD_LOCALIZATION_REPO` env var (confirm it's set and is a git repo
before using it — ask the developer rather than guessing or recreating one
if it's missing) and add the key there following its existing layout
(`<repo>/<module>/<locale>.json`, one JSON array of `{code, message, module,
locale}` per module+locale). Don't touch any file inside this project repo
to "store" a translation, and don't call a real localization-service API.

New entries go at the **top** of the array, not alphabetically inserted —
the file is meant to read newest-first so the team can see what's pending
review at a glance. When a key becomes unused (e.g. the component that
rendered it is deleted), remove its entry from the staging file too instead
of leaving it orphaned.

Before adding a new entry, search the **whole file** for that exact `code` —
not just the top — since a duplicate lower in the array is easy to miss
otherwise. If it's already there, update that entry's `message` in place
(and move it to the top, since a changed fallback is itself something
pending review) rather than appending a second entry for the same code.
After any bulk sync/audit of this file, verify there are zero duplicate
`code` values in the array as a final check.

## Unit tests

Vitest + React Testing Library, configured in `vite.config.ts`'s `test` block
(not a separate `vitest.config.ts`): `environment: "jsdom"`, `globals: true`,
`setupFiles: ["./src/test/setup.ts"]`, `restoreMocks: true`, v8 coverage.
Commands: `pnpm test` (run once), `pnpm test:watch`, `pnpm test:coverage`.

- **Colocation**: `Foo.ts(x)` → `Foo.test.ts(x)` right next to it, same as
  this repo's other colocation habits.
- **Comments**: no header docstrings, no per-`describe` comment restating
  behavior — descriptive `describe`/`it` names carry the documentation. Only
  comment a genuinely non-obvious *why* (e.g. `src/test/setup.ts`'s own
  `// jsdom doesn't implement ResizeObserver...`).
- **Mocking boundary mirrors the module-boundary/services-and-hooks rules
  above** — mock one layer below what you're testing, never deeper:
  - Testing a **service** (`services/*.ts`): mock `@/shared`'s `apiClient`
    (and `tenantId`/other config helpers if used) via `vi.mock("@/shared",
    async (importOriginal) => ({ ...actual, apiClient: { post: vi.fn(), get:
    vi.fn() } }))`. Assert the exact call made (url, method, body/params) and
    that the function returns the mocked response **verbatim** — this is the
    regression test for "a service must not reshape data" (see
    `src/modules/ir/services/facility.test.ts`).
  - Testing a **hook**: mock the `services/*.ts` functions it calls
    (`vi.mock("../services/xxx", async (importOriginal) => ({ ...actual,
    someFn: vi.fn() }))`), never `apiClient` directly and never
    `@tanstack/react-query` itself. For a query/mutation hook, wrap in a real
    `QueryClient` (`retry: false`) + `QueryClientProvider` and drive it with
    `renderHook` + `waitFor` (see `src/modules/ir/hooks/use-activities.test.tsx`).
  - Testing a **component/page**: mock the hooks it calls, not the services
    underneath them.
  - A Zustand store (`useAuthStore`, etc.): drive it directly via
    `useXStore.setState({...})`/`.getState()` — no Provider needed, and no
    `vi.mock`. Capture the store's initial state once at module load and
    reset with `store.setState(initialState, true)` (the replace flag) in
    `afterEach`, since these are real module-level singletons shared across
    every test file in the run (see `src/shared/stores/auth-store.test.ts`).
  - Don't mock `@/shared`'s i18n (`useTranslate`/`translateOr`) — with no
    real i18next instance configured, `t(key)` echoes the key back, so
    `translateOr` naturally falls back to its English fallback text. Assert
    on that fallback text directly.
- **jsdom gaps**: `window.matchMedia` and `ResizeObserver` are stubbed
  globally in `src/test/setup.ts`. Radix `Select`'s
  `hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`/
  `scrollIntoView` are **not** stubbed globally (they're needed by only a
  handful of test files) — add them locally in that test file's own
  `beforeEach`, guarded with `??` (see
  `src/modules/ir/components/review/RejectionReasonDialog.test.tsx`).
- **`<Outlet />` can't render standalone** — it calls `useRouter()`, which
  throws outside a mounted `RouterProvider`. For a wrapper component that
  renders `<Outlet />` after some loading/gating logic, assert the *throw*
  (with a `console.error` spy to suppress the noise) as proof the component
  reached that branch, rather than trying to fully mount a router (see
  `IrModuleWrapper`'s tests in `src/modules/ir/routes.test.tsx`).
- **What not to test**: `src/ui/components/ui/*` (pure shadcn CLI output) and
  `src/ui/components/reui/*` (reui CLI output) — skip both entirely, they're
  vendor-sourced, swappable on upgrade, and a thin pass-through over
  already-tested primitives (Radix for shadcn, Base UI for reui); pure
  `types/*.ts` files (no runtime behavior); a
  `constants/*.ts` file that's just static data nothing else cross-checks at
  runtime (e.g. a route-path map) — if a constants file has real logic
  (a lookup function, a derived/computed map), test that. Use judgment and
  say what you skipped and why rather than silently leaving a gap.

## Git commits

- Message prefix is `type: short description` — `feature:`, `fix:`,
  `simplify:`, `docs:`, etc. Not `feat:`.
- One logical change per commit. When a single request bundles several
  distinct fixes (e.g. multiple review-tool findings, or a feature plus a
  follow-up correction), split them into separate commits rather than one
  commit covering all of it — even if they land in the same PR.
- Don't add a `Co-Authored-By` trailer to commits in this repo.

## Opening pull requests

- Branch off `develop` for new feature/fix work; name it `feature/<short
  description>` or `fix/<short description>`. `develop` is the default base
  for `gh pr create --base develop`.
- Moving an already-merged `develop` change to `staging` (UAT) is a separate,
  later step — see "Promoting a change from `develop` to `staging`" below.
  It is never done by pointing the original PR's branch at `staging`.
- PR title: short, prefixed with the module/area it touches (e.g. `IR: add
  Type filter to activity list`, `Overview: show only first name in welcome
  text`).
- PR description: one `## Summary` section of plain bullet points describing
  the change. No test plan section, no co-author/attribution footer — this
  repo's PRs don't carry either.
- When opening a follow-up PR for the same change against a different base
  (the cherry-pick-to-`staging`/`main` flow below), reuse the original PR's
  title and `## Summary` verbatim rather than writing a new one — strip any
  bot-appended content first (e.g. CodeRabbit auto-appends its own "Summary
  by CodeRabbit" section to the PR body after review; that part isn't yours
  to carry forward).

## Promoting a change from `develop` to `staging` (UAT)

`develop` is where feature/fix PRs land first. `staging` is the separate UAT
branch — merging into `develop` does **not** put a change in front of UAT
testers; that requires a second, explicit cherry-pick PR into `staging`.

Once the original PR is merged into `develop`:

1. `git fetch origin` to get the merge commit.
2. Check how it merged: `git show --no-patch --format="%H %P" <merge-sha>`.
   One parent means it was squash-merged (a single commit to cherry-pick);
   more than one means a real merge commit, which needs the underlying
   commits picked individually instead.
3. `git checkout staging && git pull origin staging` — always cherry-pick
   onto a fresh pull, not a stale local `staging`.
4. Branch off `staging`, not `develop`. Name it `cherry-pick/<short
   description>`, matching existing branches like
   `cherry-pick/max-comment-length`.
5. `git cherry-pick <sha>` for that commit. If a separate, related PR merged
   into `develop` around the same time is actually required for the change
   to work correctly (e.g. a backend companion fix), cherry-pick that commit
   too, on top of the same branch — check with whoever asked if it's unclear
   which commits are relevant.
6. Verify the same way as any change in this repo (`pnpm typecheck` for the
   frontend, etc.) — a clean cherry-pick doesn't guarantee it still builds
   once combined with whatever else is already on `staging`.
7. Push and open a PR from that branch **against `staging`**, not `develop`.
   Reuse the original PR's title/summary (stripped of any bot-appended
   sections) unless the scope changed — e.g. extra cherry-picked commits —
   in which case add a line noting what else is included.
