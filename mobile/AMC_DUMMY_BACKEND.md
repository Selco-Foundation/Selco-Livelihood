# AMC module: dummy backend

The AMC module (ported from E4H) currently runs on a **dummy backend**. Every backend interaction goes through one interface, `AmcRemoteDataSource`, and **one switch** chooses the implementation:

```dart
// lib/repositories/amc/amc_remote_data_source.dart:20
const bool kAmcUseDummyBackend = true;
```

| Value | Behaviour |
|---|---|
| `true` (now) | `DummyAmcRemoteDataSource`: no network. Uses sample visits and the sample form, and fakes the workflow and filestore. |
| `false` | `HttpAmcRemoteDataSource`: the **Livelihood AMC API** as in the backend's "Livelihood AMC API Contract" (checked on dev, 16 Nov 2026). |

Find every dummy-related line with:

```bash
grep -rn "DUMMY-BACKEND" lib
```

## 1. Every dummy location

| # | File:line | What is dummy | Real call it replaces (already written in `HttpAmcRemoteDataSource`) |
|---|---|---|---|
| 1 | `lib/repositories/amc/amc_remote_data_source.dart:20` | **The switch** `kAmcUseDummyBackend` | Set it to `false` to use the real backend |
| 2 | `amc_dummy_backend.dart` `searchVisits` | Visit lists: status, due-date range, `searchText` (name, or exact phone), `includeSiteDetails`, sorted and paged | `POST asset-amc/v1/visit/_search?tenantId&limit&offset`, body `{searchCriteria:{tenantId, statuses, scheduledDateTo?, searchText?, includeSiteDetails: true, sortBy?, sort_direction?}}` → `{ScheduledVisits, TotalCount}` |
| 3 | `amc_dummy_backend.dart` `updateVisitWorkflow` | The contract workflow. `SUBMIT_VISIT_REPORT` needs an `AMC_VERIFICATION_PHOTO` document → PENDING_OTP_APPROVAL. `SUBMIT_OTP` with **1234** runs the contract's auto-approval rules (`dummyAutoApproval`) → APPROVED (`approvedBy: SYSTEM`) or PENDING_APPROVAL. Errors use the contract codes | `POST asset-amc/v1/visit/workflow/_update?tenantId` |
| 4 | `lib/repositories/amc/amc_dummy_backend.dart:27` `dummyAmcOtp` | The completion code is always `1234`; no SMS is sent | The real OTP is sent by SMS to the facility contact |
| 5 | `lib/repositories/amc/amc_dummy_backend.dart:220` `resendVisitOtp` | No-op | `POST asset-amc/v1/visit/_resend_otp`, body `{visitId}` (`amc_remote_data_source.dart:91`) |
| 6 | `amc_dummy_backend.dart` `searchAmcFormSchemaDocs` + `amc_dummy_form_schema.dart` | **The Livelihood AMC form (#250)** with the contract's report keys. The real data source also falls back to it while MDMS has no `AssetForm.AMC_SCHEDULED_MAINTENANCE` record | `POST egov-mdms-service/v2/_search`, tenant = the app's tenant, schemaCode `common-masters.AMCFormSchema` |
| 7 | `lib/repositories/amc/amc_dummy_backend.dart:233` `uploadFile` | Copies the photo into app storage and returns `dummy-filestore-<time>` | `POST filestore/v1/files` (multipart, module `Incident`) via `filestoreRepository.upload` (`amc_remote_data_source.dart:121`) |
| 8 | `lib/repositories/amc/amc_dummy_backend.dart:242` `downloadFile` | Reads back a dummy-uploaded photo | `GET filestore/v1/files/file?tenantId&fileStoreId` (`amc_remote_data_source.dart:125`) |
| 9 | `lib/repositories/amc/amc_dummy_backend.dart:250` `dummySeedVisits` | 7 sample visits: 3 SCHEDULED, 1 PENDING_OTP_APPROVAL, 1 PENDING_APPROVAL, 1 APPROVED, 1 REJECTED (with 2 rejection reasons) | Real visits assigned to the logged-in user |
| 10 | `lib/utils/amc/amc_utils.dart:137` and `:187` | `isDummyFileStoreId(...)` lets dummy file ids act like real ones | Delete these two checks when the dummy is removed |
| 10a | `lib/repositories/amc/amc_dummy_localization.dart` + `_dummyAmcText` in `lib/blocs/localization/app_localization.dart` | English texts for every AMC localisation key (and the visit status codes), used only when the server has no message for the key | Upload these messages to the localisation server, then delete the file and `_dummyAmcText` |

**Settled by the API contract (16 Nov 2026):** `schemaCode`/`version` are no longer sent; the MDMS form uses the app's tenant (was `in`); report keys, photo document types, numbers as numbers and `visitDate` as `yyyy-MM-dd` are in `amc_utils.dart` (`amcResponsesForSubmit`, `amcReadingPhotoDocumentTypes`).

**Temporary testing access, not a backend dummy:** `tempGrantAmcToFieldStaff` in `lib/utils/role_login_resolver.dart` (marked `TEMP-AMC-ACCESS`) gives every field staff user (`INSTALLATION_REPORT_PART_A_EDITOR`) AMC as well, so they see the role-selection screen after login. Set it to `false` once `AMC_FIELD_STAFF` is assigned to users properly.

The fake server keeps its state in `amc_dummy_backend.json` in app-support storage, not in memory, because the report is submitted from the background-service isolate. To restart from the sample data, clear the app's data.

## 2. Moving to the real backend

1. Set `kAmcUseDummyBackend = false`.
2. Delete `amc_dummy_backend.dart`, `amc_dummy_form_schema.dart` and `amc_dummy_localization.dart` (upload its texts to the localisation server first, and remove `_dummyAmcText` from `app_localization.dart`). Remove the `export ... isDummyFileStoreId` line in `amc_remote_data_source.dart` and the two `isDummyFileStoreId` checks in `amc_utils.dart`.
3. Update items 11 and 12 with the values the backend team gives you.

### Testing against E4H's backend (before Livelihood's is ready)

1. Set `kAmcUseDummyBackend = false`.
2. In `mobile/.env`, use E4H's values: `BASE_URL=https://e4h-dev.selcofoundation.org/`, `TENANT_ID=in`, and E4H's `MOBILE_APP_GLOBAL`. Copy all three from E4H's `.env`.
3. Log in as an E4H user with role `AMC_FIELD_STAFF` who has assigned visits. That user goes straight to AMC home.
4. Restore Livelihood's `.env` afterwards. Livelihood's Installation module will not work against E4H.

## 3. Questions for the backend team

Answered by the API contract: deployment and paths, tenant, OTP bypass on dev (code `1234`), rejection comment format, report keys and photo document types. Still open:

- MDMS: will you upload the AMC form (`amc_dummy_form_schema.dart`, `data`) for `livelihood`, or send yours?
- Observation keys: 4.17 (lugs used) and 4.19 (lugs insulated) have no key; the app sends `obsCableLugsUsed` / `obsCableLugsInsulated`. What is `obsCablesDamaged` for?
- End user name: the visit has no end-user name field; the app shows `facility.facilityPocName`, then `facilityName`.
- `systemType` is blank, so neither SPD question shows. When will it be filled?
- Filestore `module` for AMC photos (app sends `Incident`).

Older questions (before the contract):

- Is `amc-scheduler-service` deployed for Livelihood, and is `/asset-amc` exposed on the gateway?
- Which tenant should AMC calls and the MDMS form lookup use: `livelihood` or `in`?
- Does `common-masters.AMCFormSchema` (document `AssetForm.AMC_SCHEDULED_MAINTENANCE`, first page `AMC_Report`) exist in **MDMS v2** for Livelihood? Please send the JSON.
- What should `visitReport.schemaCode` and `version` be? E4H sends `"12345678"` and `1`.
- Which filestore `module` should AMC photos use? E4H uses `Incident`.
- Do visit search results include `facility.facility_poc_name` and `facility_poc_phone`? The OTP screen shows them.
- Is the rejection comment a JSON list string `[{"reason","comment"}]`, as the web reviewer sends in E4H?
- Is OTP bypass on in UAT, and what is the default code?
- Is the daily visit-scheduling cron running, so visits reach `SCHEDULED`?
- Do the role-actions for `AMC_FIELD_STAFF` exist, and are there test users with visits in each status?
- Have the `AMC_*` / `CORE_COMMON_*` localization messages been uploaded to `rainmaker-common` for `livelihood`?
