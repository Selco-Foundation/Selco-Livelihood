import '../../data/nosql/localization.dart';
import 'amc_remote_data_source.dart' show kAmcUseDummyBackend;

/// DUMMY-BACKEND: English texts for every localisation key the AMC screens
/// use, until they are added to the localisation server.
///
/// Used only while `kAmcUseDummyBackend` is true, and only for keys the
/// server (the device's cached localisations) has no message for, so real
/// server texts always win. Move these to the localisation server (module
/// used by the app) and delete this file when the backend is ready.
const Map<String, String> dummyAmcLocalization = {
  // AMC home / report home
  'AMC_HOME_AMC_REPORT': 'AMC Report',
  'AMC_HOME_DATA_SYNC': 'Data Sync',
  'AMC_REPORT_HOME_INSTALLATION_REPORT': 'AMC Report',
  'AMC_REPORT_HOME_NEW_AMC_REPORT': 'New AMC Report',
  'AMC_REPORT_HOME_NEW_AMC_REPORT_DESCRIPTION':
      'Start or resume reports for your scheduled AMC visits.',
  'AMC_REPORT_HOME_INBOX_DESCRIPTION':
      'View approved reports and correct rejected ones.',
  'AMC_REPORT_HOME_PENDING_APPROVAL_DESCRIPTION':
      'Reports awaiting the service completion code or review.',

  // New report list (select facility)
  'AMC_SELECT_FACILITY_TITLE': 'New AMC Report',
  'AMC_SELECT_FACILITY_REPORT': 'Report',
  'AMC_SELECT_FACILITY_AMC_DATE': 'AMC Date',
  'AMC_SELECT_FACILITY_SUBMIT_FOR_APPROVAL': 'Submit for approval',
  'AMC_SELECT_FACILITY_DELAYED_FILTER': 'AMC delayed',
  'AMC_SELECT_FACILITY_NO_VISITS_FOUND': 'No AMC visits found.',
  'AMC_SELECT_FACILITY_NO_DELAYED_VISITS_FOUND': 'No delayed AMC visits.',
  'AMC_SELECT_FACILITY_FAILED_TO_LOAD_VISITS':
      'Could not load AMC visits. Please try again.',
  'AMC_NUMBER': 'AMC Number',

  // Bookmarks
  'AMC_BOOKMARKS_ADD': 'Bookmark',
  'AMC_BOOKMARKS_REMOVE': 'Remove bookmark',
  'AMC_BOOKMARKS_FILTER': 'Bookmarked',
  'AMC_BOOKMARKS_EMPTY': 'No bookmarked reports.',
  'AMC_BOOKMARKS_ONLINE_REQUIRED':
      'Connect to the internet to change bookmarks.',
  'AMC_BOOKMARKS_SAVE_FAILED': 'Could not update the bookmark. Please try again.',

  // Pre-report status check (#247)
  'AMC_SYSTEM_STATUS_TITLE': 'System Status',
  'AMC_SYSTEM_STATUS_DESCRIPTION':
      'Answer these questions before filling in the AMC report.',
  'AMC_SYSTEM_STATUS_IN_USE_QUESTION': 'Is the end user using the system?',
  'AMC_SYSTEM_STATUS_FUNCTIONAL_QUESTION': 'Is the system functional?',
  'AMC_SYSTEM_STATUS_FUNCTIONAL_SOLAR_ONLY':
      'Answer for the solar system only.',
  'AMC_SYSTEM_STATUS_POC_NOTIFIED':
      'The Program POC has been notified that the system is not functional.',
  'AMC_SYSTEM_STATUS_POC_NOTIFY_QUEUED':
      "You're offline. The Program POC will be notified automatically when "
          'the device is back online.',
  'AMC_SYSTEM_STATUS_POC_NOTIFY_FAILED':
      'Could not notify the Program POC. You can continue with the report.',

  // Report form
  'AMC_DYNAMIC_FORM_LOADING': 'Loading...',

  // Report form (#250): sections, notes and messages
  'AMC_FORM_REPORT_HEADER': 'Report Header',
  'AMC_FORM_SITE_DETAILS': 'Site Details',
  'AMC_FORM_CHARGE_CONTROLLER_PCU': 'Charge Controller / PCU',
  'AMC_FORM_OBSERVATION_POINTS': 'Observation Points',
  'AMC_FORM_CAPTURE_READINGS': 'Capture Readings',
  'AMC_FORM_NA_NOTE':
      "If a component is not present at the site, enter 'N/A' in the relevant "
          'fields.',
  // "Not Applicable" (PRD 5.2.6): the radio list shows options in sentence
  // case, which would turn "N/A" into "N/a".
  'AMC_FORM_NA': 'Not applicable',
  'AMC_FORM_SAVE_AND_NEXT': 'Save and Next',
  'AMC_FORM_PHOTO_REQUIRED': 'Photo is required',
  'AMC_FORM_INVALID_PHONE': 'Enter a valid 10-digit phone number',

  // 1. Report header
  'AMC_FORM_DATE_OF_VISIT': 'Date of visit',
  'AMC_FORM_SERVICE_BY': 'Service by',
  'AMC_FORM_SERVICE_CONTACT_NUMBER': 'Contact number',

  // 2. Site details
  'AMC_FORM_END_USER_NAME': 'End user name',
  'AMC_FORM_END_USER_CONTACT_NUMBER': 'Contact number',
  'AMC_FORM_INSTALLATION_DATE': 'Date of installation',
  'AMC_FORM_BLOCK': 'Taluk / Block',
  'AMC_FORM_DISTRICT': 'District',
  'AMC_FORM_PINCODE': 'PIN code',
  'AMC_FORM_PURCHASE_ORDER_NUMBER': 'Purchase order no',

  // 3. Charge controller / PCU
  'AMC_FORM_PCU_PRIORITY': 'Priority',
  'AMC_FORM_SOLAR_BATTERY_GRID': 'Solar-Battery-Grid',
  'AMC_FORM_SOLAR_GRID_BATTERY': 'Solar-Grid-Battery',
  'AMC_FORM_PANELS_PER_STRING': 'No of panels in a string',

  // 4. Observation points
  'AMC_FORM_SECTION_SOLAR_PANEL': 'Solar panel',
  'AMC_FORM_SOLAR_CABLES_TIED': 'Cables are tied to the frame / protection',
  'AMC_FORM_SOLAR_PANELS_CLEAN': 'Are the panels clean?',
  'AMC_FORM_SOLAR_MMS_RUSTING': 'Rusting on MMS',
  'AMC_FORM_SOLAR_NUTS_BOLTS_RUSTING': 'Rusting on nuts and bolts',
  'AMC_FORM_SECTION_AJB': 'Array junction box (AJB)',
  'AMC_FORM_AJB_MOUNTED_FIRM': 'AJB is mounted firm to the vertical surface',
  'AMC_FORM_SECTION_BATTERY': 'Battery',
  'AMC_FORM_BATTERY_TERMINALS_CLEAN': 'Are battery terminals clean?',
  'AMC_FORM_BATTERY_PETROLEUM_JELLY':
      'Petroleum jelly is applied at all battery terminals',
  'AMC_FORM_BATTERY_FLOAT_INDICATORS_OK': 'Float indicators are not damaged',
  'AMC_FORM_BATTERY_WATER_LEVEL_OK':
      'Is the distilled water level between the green and red marks on the '
          'float indicator?',
  'AMC_FORM_SECTION_INVERTER_PCU': 'Inverter / PCU',
  'AMC_FORM_PCU_CABLES_INTACT':
      'Cables entering the PCU are intact, without loose connections',
  'AMC_FORM_SECTION_LIGHTNING_ARRESTOR': 'Lightning arrestor (LA)',
  'AMC_FORM_LA_INSULATION':
      'Insulation is provided between the LA and the elevation pole using '
          'ceramic insulators',
  'AMC_FORM_LA_FIRMLY_FIXED':
      'The entire lightning arrestor set-up is firmly fixed over the roof '
          'surface',
  'AMC_FORM_LA_SADDLE_INSULATORS':
      'GI strips / cable are provided with saddle insulators on the RCC roof',
  'AMC_FORM_SECTION_EARTHING': 'Earthing',
  'AMC_FORM_EARTHING_CONDUIT':
      'Down conductor is protected with conduit pipe until the pit',
  'AMC_FORM_EARTHING_CABLE_CONTACT':
      'Is the earthing cable in full contact with the electrode?',
  'AMC_FORM_EARTHING_ELECTRODES_BURIED':
      'Earth electrodes are buried well in the earth',
  'AMC_FORM_SECTION_CABLE_MANAGEMENT': 'Cable management',
  'AMC_FORM_CABLE_LUGS_USED': 'Cable lugs are used for termination',
  'AMC_FORM_CABLE_LUGS_CRIMPED': 'Cable lugs are properly crimped',
  'AMC_FORM_CABLE_LUGS_INSULATED': 'Cable lugs are insulated',
  'AMC_FORM_MC4_INTERLOCKED': 'MC4 connectors are properly interlocked',

  // 5. Capture readings
  'AMC_FORM_PCU_NEUTRAL_EARTH_VOLTAGE':
      'Neutral to earth voltage at PCU output (V)',
  'AMC_FORM_PCU_NEUTRAL_EARTH_VOLTAGE_PHOTO':
      'Photo: neutral to earth voltage at PCU output',
  'AMC_FORM_GRID_NEUTRAL_EARTH_VOLTAGE':
      'Neutral to earth voltage for grid input (V)',
  'AMC_FORM_GRID_NEUTRAL_EARTH_VOLTAGE_PHOTO':
      'Photo: neutral to earth voltage for grid input',
  'AMC_FORM_INVERTER_OUTPUT_VOLTAGE':
      'Inverter output voltage, with solar and grid disconnected and battery '
          'connected (V)',
  'AMC_FORM_EARTHING_ELECTRODE_AVAILABLE': 'Earthing electrode available',
  'AMC_FORM_EARTHING_WIRE_CONNECTED': 'Earthing wire connected to earth pit',
  'AMC_FORM_BATTERY_SPECIFIC_GRAVITY':
      'Battery specific gravity, measured through hydrometer',
  'AMC_FORM_GOOD': 'Good',
  'AMC_FORM_OK': 'OK',
  'AMC_FORM_BAD': 'Bad',
  'AMC_FORM_BATTERY_SPECIFIC_GRAVITY_ACTION':
      'Action taken (for specific gravity)',
  'AMC_FORM_SOLAR_SPD': 'Solar SPD',
  'AMC_FORM_SOLAR_SPD_PHOTO': 'Solar SPD photo',
  'AMC_FORM_SOLAR_SPD_ACTION': 'Solar SPD action taken',
  'AMC_FORM_GRID_SPD': 'Grid input SPD',
  'AMC_FORM_GRID_SPD_PHOTO': 'Grid input SPD photo',
  'AMC_FORM_GRID_SPD_ACTION': 'Grid input SPD action taken',
  'AMC_FORM_WORKING': 'Working',
  'AMC_FORM_FAILED': 'Failed',
  'AMC_FORM_SECTION_REMARKS': 'Remarks',
  'AMC_FORM_VENDOR_REMARKS': 'Vendor remarks',
  'AMC_FORM_END_USER_REMARKS': 'End user remarks',

  // Verification photograph (#248)
  'AMC_MEDIA_UPLOAD_VERIFICATION_PHOTO_TITLE': 'Verification Photograph',
  'AMC_MEDIA_UPLOAD_VERIFICATION_PHOTO_INSTRUCTION':
      'Please capture a selfie or photograph of yourself along with the end '
          'user in front of the solar system. This photograph is compulsory '
          'and will be used for verification.',
  'AMC_MEDIA_UPLOAD_PHOTO_REQUIRED': 'Verification photograph is required',
  'AMC_MEDIA_UPLOAD_SAVE_AND_NEXT': 'Save and Next',
  'AMC_MEDIA_UPLOAD_REPORT_SAVED':
      'Your report is saved for both offline and online use.',
  'AMC_MEDIA_UPLOAD_PHOTO_SAVE_FAILED':
      'Could not save the photograph. Please try again.',

  // Service completion code (#249)
  'AMC_OTP_INSTRUCTION': 'Enter the AMC Service Completion Code',
  'AMC_OTP_RECEIVER_INSTRUCTION_1': 'The code has been sent to',
  'AMC_OTP_RECEIVER_INSTRUCTION_2': 'on the phone number',
  'AMC_OTP_MASKED_PHONE': '******',
  'AMC_OTP_ENTER_CODE': 'Enter code',
  'AMC_OTP_RESEND_CODE': 'Resend code',
  'AMC_OTP_RESENDING': 'Resending...',
  'AMC_OTP_RESEND_SUCCESS': 'The code has been sent again.',
  'AMC_OTP_VERIFY_SUCCESS': 'Code verified. The report has been submitted.',
  'AMC_OTP_NETWORK_WARNING':
      'An internet connection is needed to verify the code.',
  'AMC_OTP_OFFLINE': "You're offline. Connect to the internet to verify the code.",
  'AMC_OTP_SERVER_UNREACHABLE': 'Could not reach the server. Please try again.',
  'AMC_OTP_INVALID_CODE':
      'The code is incorrect. Check it with the end user or tap Resend code.',
  'AMC_OTP_SUBMIT_FAILED': 'Could not submit the report.',
  'AMC_OTP_RESEND_FAILED': 'Could not resend the code. Please try again.',
  'AMC_OTP_REPORT_APPROVED': 'Report approved. You can find it in Inbox.',
  'AMC_OTP_REPORT_SENT_FOR_REVIEW':
      'Report sent for review. You can find it under Pending Approval.',
  'OTP_PLACEHOLDER': 'Code',
  'OTP_PLACEHOLDER_IS_REQUIRED': 'Code is required',

  // Pending Approval (Data Sync) / Inbox
  'AMC_DRAFT_PENDING_OTP_APPROVAL': 'Pending Service Code',
  'AMC_DRAFT_PENDING_APPROVAL': 'Pending Approval',
  'AMC_DRAFT_NO_DRAFTS_TO_DISPLAY': 'No reports to display.',
  'AMC_INBOX_NO_VISITS_TO_DISPLAY': 'No reports to display.',
  'INBOX_TITLE': 'Inbox',
  'INBOX_APPROVED': 'Approved',
  'INBOX_REJECTED': 'Rejected',
  'INBOX_SEARCH_HEALTH_FACILITY': 'Search by name',
  'SUBMIT_FOR_APPROVAL_VIEW': 'View',
  'SHARED_CARDS_SUBMIT_FOR_APPROVAL': 'Submit for approval',
  'SHARED_CARDS_VIEW_REPORT': 'View Report',
  'SHARED_CARDS_VIEW_SUMMARY': 'View Summary',

  // Visit statuses shown on cards
  'SCHEDULED': 'Scheduled',
  'PENDING_OTP_APPROVAL': 'Pending Service Code',
  'PENDING_APPROVAL': 'Pending Approval',
  'APPROVED': 'Approved',
  'REJECTED': 'Rejected',

  // Common texts (E4H CORE_COMMON_*)
  'CORE_COMMON_NEXT': 'Next',
  'CORE_COMMON_BACK': 'Back',
  'CORE_COMMON_BACK_TO_HOME': 'Back to Home',
  'CORE_COMMON_SUBMIT': 'Submit',
  'CORE_COMMON_RETRY': 'Retry',
  'CORE_COMMON_HELP': 'Help',
  'CORE_COMMON_CLEAR': 'Clear',
  'CORE_COMMON_SORT': 'Sort',
  'CORE_COMMON_SORT_BY': 'Sort by',
  'CORE_COMMON_NEWEST_FIRST': 'Newest first',
  'CORE_COMMON_OLDEST_FIRST': 'Oldest first',
  'CORE_COMMON_LOADING': 'Loading...',
  'CORE_COMMON_LOADING_APP_DATA': 'Loading app data...',
  'CORE_COMMON_LOADING_SCHEMA': 'Loading the form...',
  'CORE_COMMON_FORM_SCHEMA_MISSING': 'The form could not be loaded.',
  'CORE_COMMON_STATUS': 'Status',
  'CORE_COMMON_STATE': 'State',
  'CORE_COMMON_DISTRICT': 'District',
  'CORE_COMMON_BLOCK': 'Block',
  'CORE_COMMON_SUBMISSION_DATE': 'Submission Date',
  'CORE_COMMON_APPROVED_DATE': 'Approved Date',
  'CORE_COMMON_REJECTED_DATE': 'Rejected Date',
  'CORE_COMMON_IS_REQUIRED': 'This field is required',
  'CORE_COMMON_MUST_BE_NUMBER': 'Must be a number',
  'CORE_COMMON_HAS_INVALID_FORMAT': 'Invalid format',
  'CORE_COMMON_ABOVE_MAXIMUM': 'Value is above the maximum',
  'CORE_COMMON_BELOW_MINIMUM': 'Value is below the minimum',
  'CORE_COMMON_PLEASE_CORRECT': 'Please correct the highlighted fields',

  // New key added for AMC's photo picker (#248). Other Livelihood keys the
  // AMC screens share (COMMON_*, INSTALLATION_REPORT_*, MACHINE_FORM_*, ...)
  // already exist for the Installation App and are left to the server.
  'MACHINE_FORM_GALLERY_PERMISSION_REQUIRED':
      'Photo access is required. Please allow access and try again.',
};

/// DUMMY-BACKEND: the forms engine translates the AMC form's labels from
/// this list only, so the dummy AMC texts (`dummyAmcLocalization`) are added
/// for codes the server has no message for. Server messages always win.
List<Localization> withDummyAmcLocalizations(
    List<Localization> strings, String locale) {
  if (!kAmcUseDummyBackend) return strings;
  final known = {for (final s in strings) s.code};
  return [
    ...strings,
    for (final entry in dummyAmcLocalization.entries)
      if (!known.contains(entry.key))
        Localization()
          ..code = entry.key
          ..message = entry.value
          ..module = 'dummy-amc'
          ..locale = locale,
  ];
}
