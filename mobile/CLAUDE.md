# Livelihood Mobile (Flutter)

Flutter app for SELCO Livelihood field staff/vendors: installation reports, asset/BOM flow, AMC visits.
Package name `livelihood`. Built on eGov DIGIT packages (`digit_ui_components`, `digit_forms_engine`).

## Commands (run from `mobile/`)
- Codegen after touching `@freezed`, `@JsonSerializable`, `@collection` (Isar) or `@RoutePage`:
  `dart run build_runner build --delete-conflicting-outputs`
- Check: `flutter analyze` then `flutter test` (or `flutter test test/<file>_test.dart` for one file)

## Token rules — read before exploring
- NEVER read generated files: `*.g.dart`, `*.freezed.dart`, `*.gr.dart`, `build/`, `.dart_tool/`. Read the source file and regenerate.
- Don't scan the codebase. Use the map below, then `grep` for a symbol. Read only the lines you need (offset/limit) for files > 300 lines (e.g. `test/amc_test.dart`, `lib/router/app_router.dart`, `lib/utils/i18_key_constants.dart`).
- Copy an existing example (listed below) instead of designing from scratch.
- Keep tasks small. If a request touches more than ~5 files or several screens, propose a split first.

## Code map
| Need | Go to | Example to copy |
|---|---|---|
| Screen | `lib/pages/` (`lib/pages/amc/` for AMC) — `@RoutePage()` | `lib/pages/amc/amc_view_schedule.dart` |
| Route | path const in `lib/router/routes.dart`, entry in `lib/router/app_router.dart` | `Routes.amcViewSchedule` |
| State | `lib/blocs/<feature>/<feature>.dart` — flutter_bloc + freezed events/states | `lib/blocs/scheduled_visit/scheduled_visit.dart` |
| Data / API | `lib/repositories/` ; endpoint paths ONLY in `lib/utils/api_paths.dart` | `lib/repositories/amc/scheduled_visit_repo.dart` |
| AMC backend calls | `lib/repositories/amc/amc_remote_data_source.dart` (dummy switch `kAmcUseDummyBackend`) | — |
| HTTP | `lib/data/remote_client.dart`, `lib/data/api_interceptors.dart` (dio) | — |
| Offline cache | Isar collections in `lib/data/nosql/`, instance via `Constants().isar` | `cache_scheduled_visit.dart` |
| Models | `lib/model/<feature>/` (freezed + json_serializable) | `lib/model/amc/scheduled_visit.dart` |
| Shared widgets | `lib/widgets/` (AMC: `lib/widgets/amc/`) | — |
| Helpers | `lib/utils/` (AMC: `lib/utils/amc/`); `context.translate`/`context.theme` in `lib/utils/extensions.dart` | — |
| Env | `lib/utils/envConfig.dart` reads `.env` (never print/commit its values) | — |
| Tests | `test/` (Isar native lib is set up by `test/flutter_test_config.dart`) | `test/amc_test.dart` |

## Conventions
- All user-visible text: `context.translate(i18.<group>.<key>)`, keys in `lib/utils/i18_key_constants.dart` (imported `as i18`). No hard-coded strings.
- AMC code is ported from E4H (`../../E4H_Digital_Platform/mobile`): keep E4H key strings and behaviour (bugs included) unless the task says to change them.
- Backend not ready → put it behind the dummy switch, mark it `// DUMMY-BACKEND`, and list it as a question for the backend team. Do not write backend code.
- Inject repositories through optional constructor params (`{ScheduledVisitRepository? repository}`) so tests can pass fakes.
- Guard async UI/bloc work against stale responses (request counter pattern, see the View Schedule page).
- Comments explain *why*; reference the ticket number (`/// #252 View Schedule: ...`).

## Done means
1. codegen re-run if annotations changed, 2. `flutter analyze` clean for touched files, 3. related tests pass / new test added for logic, 4. short summary: files changed + anything left as a backend question.
