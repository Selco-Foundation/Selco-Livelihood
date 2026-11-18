# Livelihood AMC – localisation messages

For the localisation server. Tenant `livelihood`, module `rainmaker-amc` (the AMC module; the app fetches `rainmaker-common` and `rainmaker-amc`), locale `en_IN`.
Total: 197 codes. Words in curly braces, such as `{days}`, `{count}`, `{date}` and `{path}`, are filled in by the app, so keep them exactly as written.
A ready-to-send upsert body for all of them is in `AMC_LOCALISATION_upsert.json`.

## Section 1 – Migrated from E4H (80 codes)

Codes that the E4H AMC module already used and that came over with the migration (commit f0b94b4fe).

| # | Code | Message (en_IN) |
|---|---|---|
| 1 | `AMC_HOME_AMC_REPORT` | AMC Report |
| 2 | `AMC_HOME_DATA_SYNC` | Data Sync |
| 3 | `AMC_REPORT_HOME_INSTALLATION_REPORT` | AMC Report |
| 4 | `AMC_REPORT_HOME_NEW_AMC_REPORT` | New AMC Report |
| 5 | `AMC_REPORT_HOME_NEW_AMC_REPORT_DESCRIPTION` | Start or resume reports for your scheduled AMC visits. |
| 6 | `AMC_REPORT_HOME_INBOX_DESCRIPTION` | View approved reports and correct rejected ones. |
| 7 | `AMC_REPORT_HOME_PENDING_APPROVAL_DESCRIPTION` | Reports awaiting the service completion code or review. |
| 8 | `AMC_SELECT_FACILITY_TITLE` | New AMC Report |
| 9 | `AMC_SELECT_FACILITY_REPORT` | Report |
| 10 | `AMC_SELECT_FACILITY_AMC_DATE` | AMC Date |
| 11 | `AMC_SELECT_FACILITY_SUBMIT_FOR_APPROVAL` | Submit for approval |
| 12 | `AMC_SELECT_FACILITY_NO_VISITS_FOUND` | No AMC visits found. |
| 13 | `AMC_SELECT_FACILITY_FAILED_TO_LOAD_VISITS` | Could not load AMC visits. Please try again. |
| 14 | `AMC_NUMBER` | AMC Number |
| 15 | `AMC_BOOKMARKS_ADD` | Bookmark |
| 16 | `AMC_BOOKMARKS_REMOVE` | Remove bookmark |
| 17 | `AMC_BOOKMARKS_FILTER` | Bookmarked |
| 18 | `AMC_BOOKMARKS_EMPTY` | No bookmarked reports. |
| 19 | `AMC_BOOKMARKS_ONLINE_REQUIRED` | Connect to the internet to change bookmarks. |
| 20 | `AMC_BOOKMARKS_SAVE_FAILED` | Could not update the bookmark. Please try again. |
| 21 | `AMC_DYNAMIC_FORM_LOADING` | Loading... |
| 22 | `AMC_OTP_INSTRUCTION` | Enter the AMC Service Completion Code |
| 23 | `AMC_OTP_RECEIVER_INSTRUCTION_1` | The code has been sent to |
| 24 | `AMC_OTP_RECEIVER_INSTRUCTION_2` | on the phone number |
| 25 | `AMC_OTP_MASKED_PHONE` | ****** |
| 26 | `AMC_OTP_ENTER_CODE` | Enter code |
| 27 | `AMC_OTP_RESEND_CODE` | Resend code |
| 28 | `AMC_OTP_RESENDING` | Resending... |
| 29 | `AMC_OTP_RESEND_SUCCESS` | The code has been sent again. |
| 30 | `AMC_OTP_VERIFY_SUCCESS` | Code verified. The report has been submitted. |
| 31 | `AMC_OTP_NETWORK_WARNING` | An internet connection is needed to verify the code. |
| 32 | `OTP_PLACEHOLDER` | Code |
| 33 | `AMC_DRAFT_PENDING_OTP_APPROVAL` | Pending Service Code |
| 34 | `AMC_DRAFT_PENDING_APPROVAL` | Pending Approval |
| 35 | `AMC_DRAFT_NO_DRAFTS_TO_DISPLAY` | No reports to display. |
| 36 | `AMC_INBOX_NO_VISITS_TO_DISPLAY` | No reports to display. |
| 37 | `INBOX_TITLE` | Inbox |
| 38 | `INBOX_APPROVED` | Approved |
| 39 | `INBOX_REJECTED` | Rejected |
| 40 | `INBOX_SEARCH_HEALTH_FACILITY` | Search by name |
| 41 | `SUBMIT_FOR_APPROVAL_VIEW` | View |
| 42 | `SHARED_CARDS_SUBMIT_FOR_APPROVAL` | Submit for approval |
| 43 | `SHARED_CARDS_VIEW_REPORT` | View Report |
| 44 | `SHARED_CARDS_VIEW_SUMMARY` | View Summary |
| 45 | `SCHEDULED` | Scheduled |
| 46 | `PENDING_OTP_APPROVAL` | Pending Service Code |
| 47 | `PENDING_APPROVAL` | Pending Approval |
| 48 | `APPROVED` | Approved |
| 49 | `REJECTED` | Rejected |
| 50 | `CORE_COMMON_NEXT` | Next |
| 51 | `CORE_COMMON_BACK` | Back |
| 52 | `CORE_COMMON_BACK_TO_HOME` | Back to Home |
| 53 | `CORE_COMMON_SUBMIT` | Submit |
| 54 | `CORE_COMMON_RETRY` | Retry |
| 55 | `CORE_COMMON_HELP` | Help |
| 56 | `CORE_COMMON_CLEAR` | Clear |
| 57 | `CORE_COMMON_SORT` | Sort |
| 58 | `CORE_COMMON_SORT_BY` | Sort by |
| 59 | `CORE_COMMON_NEWEST_FIRST` | Newest first |
| 60 | `CORE_COMMON_OLDEST_FIRST` | Oldest first |
| 61 | `CORE_COMMON_LOADING` | Loading... |
| 62 | `CORE_COMMON_LOADING_APP_DATA` | Loading app data... |
| 63 | `CORE_COMMON_LOADING_SCHEMA` | Loading the form... |
| 64 | `CORE_COMMON_FORM_SCHEMA_MISSING` | The form could not be loaded. |
| 65 | `CORE_COMMON_STATUS` | Status |
| 66 | `CORE_COMMON_STATE` | State |
| 67 | `CORE_COMMON_DISTRICT` | District |
| 68 | `CORE_COMMON_BLOCK` | Block |
| 69 | `CORE_COMMON_SUBMISSION_DATE` | Submission Date |
| 70 | `CORE_COMMON_APPROVED_DATE` | Approved Date |
| 71 | `CORE_COMMON_REJECTED_DATE` | Rejected Date |
| 72 | `CORE_COMMON_IS_REQUIRED` | This field is required |
| 73 | `CORE_COMMON_MUST_BE_NUMBER` | Must be a number |
| 74 | `CORE_COMMON_HAS_INVALID_FORMAT` | Invalid format |
| 75 | `CORE_COMMON_ABOVE_MAXIMUM` | Value is above the maximum |
| 76 | `CORE_COMMON_BELOW_MINIMUM` | Value is below the minimum |
| 77 | `CORE_COMMON_PLEASE_CORRECT` | Please correct the highlighted fields |

### Used by the app but with no English text in the app yet (3 codes)

Also from E4H. Please check whether these already exist on the Livelihood server. If not, add them with the suggested text below.

| # | Code | Message (en_IN) |
|---|---|---|
| 1 | `COMMON_NO_MATCHING_FACILITIES_FOUND` | No matching records found. |
| 2 | `CORE_COMMON_COULD_NOT_FETCH_LOCATION` | Could not fetch your location. Please try again. |
| 3 | `HOME_SOMETHING_WENT_WRONG` | Something went wrong. Please try again. |

## Section 2 – New in Livelihood, tickets #246 to #252 (117 codes)

Added from "AMC Delayed Filter on New Report" (#246) to "Add View Schedule with On-Screen Viewing and Excel Download" (#252). These cover the delayed filter, system-status questions, verification photo, completion-code rules, inbox rework and rejection reasons, the new report form, and View Schedule.

| # | Code | Message (en_IN) |
|---|---|---|
| 1 | `AMC_HOME_VIEW_SCHEDULE` | View Schedule |
| 2 | `AMC_SCHEDULE_TITLE` | View Schedule |
| 3 | `AMC_SCHEDULE_PERIOD_PROMPT` | Show AMC schedule for the next |
| 4 | `AMC_SCHEDULE_PERIOD_DAYS` | {days} days |
| 5 | `AMC_SCHEDULE_COUNT` | {count} AMCs in the next {days} days |
| 6 | `AMC_SCHEDULE_DUE` | Due {date} |
| 7 | `AMC_SCHEDULE_END_USER_NAME` | End user name |
| 8 | `AMC_SCHEDULE_PHONE` | Phone number |
| 9 | `AMC_SCHEDULE_SCHEDULED_DATE` | Scheduled AMC date |
| 10 | `AMC_SCHEDULE_MACHINES` | Machines |
| 11 | `AMC_SCHEDULE_EMPTY` | No AMC visits are scheduled in the next {days} days. |
| 12 | `AMC_SCHEDULE_LOAD_FAILED` | Could not load the schedule. Check your internet connection and try again. |
| 13 | `AMC_SCHEDULE_OFFLINE` | No internet. Showing the schedule last saved on this device; it may be out of date. |
| 14 | `AMC_SCHEDULE_DOWNLOAD` | Download Schedule |
| 15 | `AMC_SCHEDULE_DOWNLOADED` | Schedule saved to {path} |
| 16 | `AMC_SCHEDULE_DOWNLOAD_FAILED` | Could not download the schedule. Please try again. |
| 17 | `AMC_SCHEDULE_NO_APP_TO_OPEN` | Schedule saved to {path}. No app on this phone can open Excel files. |
| 18 | `AMC_SCHEDULE_OPEN` | Open |
| 19 | `AMC_SELECT_FACILITY_DELAYED_FILTER` | AMC delayed |
| 20 | `AMC_SELECT_FACILITY_NO_DELAYED_VISITS_FOUND` | No delayed AMC visits. |
| 21 | `AMC_SYSTEM_STATUS_TITLE` | System Status |
| 22 | `AMC_SYSTEM_STATUS_DESCRIPTION` | Answer these questions before filling in the AMC report. |
| 23 | `AMC_SYSTEM_STATUS_IN_USE_QUESTION` | Is the end user using the system? |
| 24 | `AMC_SYSTEM_STATUS_FUNCTIONAL_QUESTION` | Is the system functional? |
| 25 | `AMC_SYSTEM_STATUS_FUNCTIONAL_SOLAR_ONLY` | Answer for the solar system only. |
| 26 | `AMC_SYSTEM_STATUS_POC_NOTIFIED` | The Program POC has been notified that the system is not functional. |
| 27 | `AMC_SYSTEM_STATUS_POC_NOTIFY_QUEUED` | You're offline. The Program POC will be notified automatically when the device is back online. |
| 28 | `AMC_SYSTEM_STATUS_POC_NOTIFY_FAILED` | Could not notify the Program POC. You can continue with the report. |
| 29 | `AMC_FORM_REPORT_HEADER` | Report Header |
| 30 | `AMC_FORM_SITE_DETAILS` | Site Details |
| 31 | `AMC_FORM_CHARGE_CONTROLLER_PCU` | Charge Controller / PCU |
| 32 | `AMC_FORM_OBSERVATION_POINTS` | Observation Points |
| 33 | `AMC_FORM_CAPTURE_READINGS` | Capture Readings |
| 34 | `AMC_FORM_NA_NOTE` | If a component is not present at the site, enter 'N/A' in the relevant fields. |
| 35 | `AMC_FORM_NA` | Not applicable |
| 36 | `AMC_FORM_SAVE_AND_NEXT` | Save and Next |
| 37 | `AMC_FORM_PHOTO_REQUIRED` | Photo is required |
| 38 | `AMC_FORM_INVALID_PHONE` | Enter a valid 10-digit phone number |
| 39 | `AMC_FORM_DATE_OF_VISIT` | Date of visit |
| 40 | `AMC_FORM_SERVICE_BY` | Service by |
| 41 | `AMC_FORM_SERVICE_CONTACT_NUMBER` | Contact number |
| 42 | `AMC_FORM_END_USER_NAME` | End user name |
| 43 | `AMC_FORM_END_USER_CONTACT_NUMBER` | Contact number |
| 44 | `AMC_FORM_INSTALLATION_DATE` | Date of installation |
| 45 | `AMC_FORM_BLOCK` | Taluk / Block |
| 46 | `AMC_FORM_DISTRICT` | District |
| 47 | `AMC_FORM_PINCODE` | PIN code |
| 48 | `AMC_FORM_PURCHASE_ORDER_NUMBER` | Purchase order no |
| 49 | `AMC_FORM_PCU_PRIORITY` | Priority |
| 50 | `AMC_FORM_SOLAR_BATTERY_GRID` | Solar-Battery-Grid |
| 51 | `AMC_FORM_SOLAR_GRID_BATTERY` | Solar-Grid-Battery |
| 52 | `AMC_FORM_PANELS_PER_STRING` | No of panels in a string |
| 53 | `AMC_FORM_SECTION_SOLAR_PANEL` | Solar panel |
| 54 | `AMC_FORM_SOLAR_CABLES_TIED` | Cables are tied to the frame / protection |
| 55 | `AMC_FORM_SOLAR_PANELS_CLEAN` | Are the panels clean? |
| 56 | `AMC_FORM_SOLAR_MMS_RUSTING` | Rusting on MMS |
| 57 | `AMC_FORM_SOLAR_NUTS_BOLTS_RUSTING` | Rusting on nuts and bolts |
| 58 | `AMC_FORM_SECTION_AJB` | Array junction box (AJB) |
| 59 | `AMC_FORM_AJB_MOUNTED_FIRM` | AJB is mounted firm to the vertical surface |
| 60 | `AMC_FORM_SECTION_BATTERY` | Battery |
| 61 | `AMC_FORM_BATTERY_TERMINALS_CLEAN` | Are battery terminals clean? |
| 62 | `AMC_FORM_BATTERY_PETROLEUM_JELLY` | Petroleum jelly is applied at all battery terminals |
| 63 | `AMC_FORM_BATTERY_FLOAT_INDICATORS_OK` | Float indicators are not damaged |
| 64 | `AMC_FORM_BATTERY_WATER_LEVEL_OK` | Is the distilled water level between the green and red marks on the float indicator? |
| 65 | `AMC_FORM_SECTION_INVERTER_PCU` | Inverter / PCU |
| 66 | `AMC_FORM_PCU_CABLES_INTACT` | Cables entering the PCU are intact, without loose connections |
| 67 | `AMC_FORM_SECTION_LIGHTNING_ARRESTOR` | Lightning arrestor (LA) |
| 68 | `AMC_FORM_LA_INSULATION` | Insulation is provided between the LA and the elevation pole using ceramic insulators |
| 69 | `AMC_FORM_LA_FIRMLY_FIXED` | The entire lightning arrestor set-up is firmly fixed over the roof surface |
| 70 | `AMC_FORM_LA_SADDLE_INSULATORS` | GI strips / cable are provided with saddle insulators on the RCC roof |
| 71 | `AMC_FORM_SECTION_EARTHING` | Earthing |
| 72 | `AMC_FORM_EARTHING_CONDUIT` | Down conductor is protected with conduit pipe until the pit |
| 73 | `AMC_FORM_EARTHING_CABLE_CONTACT` | Is the earthing cable in full contact with the electrode? |
| 74 | `AMC_FORM_EARTHING_ELECTRODES_BURIED` | Earth electrodes are buried well in the earth |
| 75 | `AMC_FORM_SECTION_CABLE_MANAGEMENT` | Cable management |
| 76 | `AMC_FORM_CABLE_LUGS_USED` | Cable lugs are used for termination |
| 77 | `AMC_FORM_CABLE_LUGS_CRIMPED` | Cable lugs are properly crimped |
| 78 | `AMC_FORM_CABLE_LUGS_INSULATED` | Cable lugs are insulated |
| 79 | `AMC_FORM_MC4_INTERLOCKED` | MC4 connectors are properly interlocked |
| 80 | `AMC_FORM_PCU_NEUTRAL_EARTH_VOLTAGE` | Neutral to earth voltage at PCU output (V) |
| 81 | `AMC_FORM_PCU_NEUTRAL_EARTH_VOLTAGE_PHOTO` | Photo: neutral to earth voltage at PCU output |
| 82 | `AMC_FORM_GRID_NEUTRAL_EARTH_VOLTAGE` | Neutral to earth voltage for grid input (V) |
| 83 | `AMC_FORM_GRID_NEUTRAL_EARTH_VOLTAGE_PHOTO` | Photo: neutral to earth voltage for grid input |
| 84 | `AMC_FORM_INVERTER_OUTPUT_VOLTAGE` | Inverter output voltage, with solar and grid disconnected and battery connected (V) |
| 85 | `AMC_FORM_EARTHING_ELECTRODE_AVAILABLE` | Earthing electrode available |
| 86 | `AMC_FORM_EARTHING_WIRE_CONNECTED` | Earthing wire connected to earth pit |
| 87 | `AMC_FORM_BATTERY_SPECIFIC_GRAVITY` | Battery specific gravity, measured through hydrometer |
| 88 | `AMC_FORM_GOOD` | Good |
| 89 | `AMC_FORM_OK` | OK |
| 90 | `AMC_FORM_BAD` | Bad |
| 91 | `AMC_FORM_BATTERY_SPECIFIC_GRAVITY_ACTION` | Action taken (for specific gravity) |
| 92 | `AMC_FORM_SOLAR_SPD` | Solar SPD |
| 93 | `AMC_FORM_SOLAR_SPD_PHOTO` | Solar SPD photo |
| 94 | `AMC_FORM_SOLAR_SPD_ACTION` | Solar SPD action taken |
| 95 | `AMC_FORM_GRID_SPD` | Grid input SPD |
| 96 | `AMC_FORM_GRID_SPD_PHOTO` | Grid input SPD photo |
| 97 | `AMC_FORM_GRID_SPD_ACTION` | Grid input SPD action taken |
| 98 | `AMC_FORM_WORKING` | Working |
| 99 | `AMC_FORM_FAILED` | Failed |
| 100 | `AMC_FORM_SECTION_REMARKS` | Remarks |
| 101 | `AMC_FORM_VENDOR_REMARKS` | Vendor remarks |
| 102 | `AMC_FORM_END_USER_REMARKS` | End user remarks |
| 103 | `AMC_MEDIA_UPLOAD_VERIFICATION_PHOTO_TITLE` | Verification Photograph |
| 104 | `AMC_MEDIA_UPLOAD_VERIFICATION_PHOTO_INSTRUCTION` | Please capture a selfie or photograph of yourself along with the end user in front of the solar system. This photograph is compulsory and will be used for verification. |
| 105 | `AMC_MEDIA_UPLOAD_PHOTO_REQUIRED` | Verification photograph is required |
| 106 | `AMC_MEDIA_UPLOAD_SAVE_AND_NEXT` | Save and Next |
| 107 | `AMC_MEDIA_UPLOAD_REPORT_SAVED` | Your report is saved for both offline and online use. |
| 108 | `AMC_MEDIA_UPLOAD_PHOTO_SAVE_FAILED` | Could not save the photograph. Please try again. |
| 109 | `AMC_OTP_OFFLINE` | You're offline. Connect to the internet to verify the code. |
| 110 | `AMC_OTP_SERVER_UNREACHABLE` | Could not reach the server. Please try again. |
| 111 | `AMC_OTP_INVALID_CODE` | The code is incorrect. Check it with the end user or tap Resend code. |
| 112 | `AMC_OTP_SUBMIT_FAILED` | Could not submit the report. |
| 113 | `AMC_OTP_RESEND_FAILED` | Could not resend the code. Please try again. |
| 114 | `AMC_OTP_REPORT_APPROVED` | Report approved. You can find it in Inbox. |
| 115 | `AMC_OTP_REPORT_SENT_FOR_REVIEW` | Report sent for review. You can find it under Pending Approval. |
| 116 | `OTP_PLACEHOLDER_IS_REQUIRED` | Code is required |
| 117 | `MACHINE_FORM_GALLERY_PERMISSION_REQUIRED` | Photo access is required. Please allow access and try again. |
