---
name: flutter-feature
description: Implement a new screen, flow or feature slice in the Livelihood Flutter app (model, repository, bloc, page, route, i18n, tests) by copying the project's existing patterns. Use when asked to build/add/implement a screen, page, list, form, API integration or feature from a ticket, plan or design image.
---

# Build a feature slice the project way

Work on ONE agreed task at a time (from `grill-me` if the task is not already clear). Copy patterns from the reference files; don't read other features "for context".

## Reference implementation (View Schedule, ticket #252) — read only the layer you're building
| Layer | Copy from |
|---|---|
| Model (freezed + json) | `lib/model/amc/scheduled_visit.dart`, `lib/model/amc/amc_schedule.dart` |
| Endpoint path | `lib/utils/api_paths.dart` (add a `static const`) |
| Remote call + dummy | `lib/repositories/amc/amc_remote_data_source.dart` |
| Repository (remote + Isar fallback, `fromCache`) | `lib/repositories/amc/scheduled_visit_repo.dart` |
| Isar cache | `lib/data/nosql/cache_scheduled_visit.dart` — also register the schema where `Constants().isar` opens (`lib/utils/constants.dart`) |
| Bloc (freezed events/states, stale-request guard, pagination) | `lib/blocs/scheduled_visit/scheduled_visit.dart` |
| Page | `lib/pages/amc/amc_view_schedule.dart` |
| Route | `lib/router/routes.dart` + entry near `AmcViewScheduleRoute` in `lib/router/app_router.dart` |
| i18n | group class in `lib/utils/i18_key_constants.dart` (see `AmcScheduleText`) |
| Test | `test/amc_test.dart` — grep for a nearby `group(` and read just that block |

## Order
1. Model → `dart run build_runner build --delete-conflicting-outputs`
2. API path + data source (dummy behind switch + `// DUMMY-BACKEND` if backend isn't ready)
3. Repository (constructor-injectable)
4. Bloc (or `StatefulWidget` state if the screen is simple and local, like View Schedule)
5. Page + route → run codegen again (`*.gr.dart`)
6. i18n keys
7. Test for logic you added (repository mapping, bloc states, helpers). Use fakes via constructor params.
8. `flutter analyze` and `flutter test test/<file>_test.dart`

Follow the UI rules (`.claude/rules/flutter-ui.md`) for anything in `lib/pages/` or `lib/widgets/`.

## Finish with
- Files changed (one line each)
- New i18n keys with English text
- Dummy-backend spots + backend questions
- Anything left for the next task
- If this task revealed a reusable pattern not covered here, propose a short addition to this skill or `CLAUDE.md` (don't write it without approval).
