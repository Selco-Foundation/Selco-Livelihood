---
paths:
  - "lib/pages/**/*.dart"
  - "lib/widgets/**/*.dart"
---

# UI rules (pages & widgets)

- Use `digit_ui_components` before Material: `DigitCard`, `DigitButton`, `DigitTextFormInput`, `DigitSearchFormInput`, `DigitDropdown`, `DigitDivider`, `DigitTabBar`, `DigitStepper`.
- Colours/text only from the theme, never hex literals:
  `final theme = context.theme;` → `theme.colorTheme.primary.primary2`, `theme.colorTheme.text.primary`, `theme.colorTheme.generic.background`, `theme.digitTextTheme(context).<style>`.
- Before creating a widget, check `lib/widgets/` (and `lib/widgets/amc/`) — e.g. `livelihood_app_bar.dart`, `footer_button.dart`, `report_navigation_header.dart`, `amc/facility_list_controls.dart`, `amc/loading_indicator.dart`, `amc/report_card.dart`, `image_uploader.dart`, `file_upload_widget.dart`, `predefined_dropdown_field.dart`, `operation_progress_overlay.dart`. Reuse or extend; don't duplicate.
- Errors/session messages go through `widgets/errors/app_error_notifier.dart`.
- Every string via `context.translate(i18.x.y)`; add new keys to `lib/utils/i18_key_constants.dart` in the right group, and list the new keys (with English text) in your summary so they can be uploaded to localization.
- Lists: show loading, empty and error states; paginate like `ScheduledVisitBloc` (10 per page).
- Pages that need data take an optional repository/bloc param for tests.
- When given a design image, match layout and spacing to existing screens of the same type rather than guessing pixel values.
