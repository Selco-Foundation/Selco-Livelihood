library i18;

const common = Common();
const welcome = Welcome();
const login = Login();
const home = Home();
const installationReportHome = InstallationReportHome();
const machineForm = MachineForm();
const assetFlow = AssetFlow();
const installationReport = InstallationReport();
const scanner = Scanner();

class Common {
  const Common();

  String get appName => 'COMMON_APP_NAME';
  String get appDescriptor => 'COMMON_APP_DESCRIPTOR';
  String get requiredMessage => 'COMMON_REQUIRED_MESSAGE';
  String get poweredBy => 'COMMON_POWERED_BY';
  String get sort => 'COMMON_SORT';
  String get clear => 'COMMON_CLEAR';
  String get back => 'COMMON_BACK';
  String get status => 'COMMON_STATUS';
  String get yes => 'COMMON_YES';
  String get no => 'COMMON_NO';
  String get settings => 'COMMON_SETTINGS';
  String get home => 'COMMON_HOME';
  String get next => 'COMMON_NEXT';
  String get submit => 'COMMON_SUBMIT';
  String get optional => 'COMMON_OPTIONAL';
  String get name => 'COMMON_NAME';
  String get count => 'COMMON_COUNT';
  String get edit => 'COMMON_EDIT';
  String get add => 'COMMON_ADD';
  String get view => 'COMMON_VIEW';
  String get required => 'COMMON_REQUIRED';
}

class Welcome {
  const Welcome();

  String get welcomeTitle => 'WELCOME_TITLE';
  String get welcomeDescription => 'WELCOME_DESCRIPTION';
  String get proceed => 'WELCOME_PROCEED';

  String get viewFacilitiesTitle => 'WELCOME_ITEM_VIEW_FACILITIES_TITLE';
  String get viewFacilitiesDescription => 'WELCOME_ITEM_VIEW_FACILITIES_DESCRIPTION';
  String get createReportsTitle => 'WELCOME_ITEM_CREATE_REPORTS_TITLE';
  String get createReportsDescription => 'WELCOME_ITEM_CREATE_REPORTS_DESCRIPTION';
  String get saveReportsTitle => 'WELCOME_ITEM_SAVE_REPORTS_TITLE';
  String get saveReportsDescription => 'WELCOME_ITEM_SAVE_REPORTS_DESCRIPTION';
  String get submitForApprovalTitle => 'WELCOME_ITEM_SUBMIT_FOR_APPROVAL_TITLE';
  String get submitForApprovalDescription => 'WELCOME_ITEM_SUBMIT_FOR_APPROVAL_DESCRIPTION';
  String get editReportsTitle => 'WELCOME_ITEM_EDIT_REPORTS_TITLE';
  String get editReportsDescription => 'WELCOME_ITEM_EDIT_REPORTS_DESCRIPTION';
}

class Login {
  const Login();

  String get login => 'LOGIN_TITLE';
  String get userId => 'LOGIN_USER_ID';
  String get password => 'LOGIN_PASSWORD';
  String get consentPrefix => 'LOGIN_CONSENT_PREFIX';
  String get privacyPolicy => 'LOGIN_PRIVACY_POLICY';
  String get consentConnector => 'LOGIN_CONSENT_CONNECTOR';
  String get termsOfUse => 'LOGIN_TERMS_OF_USE';
  String get policyUrlNotConfigured => 'LOGIN_POLICY_URL_NOT_CONFIGURED';
  String get accessRoleRequired => 'LOGIN_ACCESS_ROLE_REQUIRED';
  String get loginFailed => 'LOGIN_FAILED';
  String get missingUserData => 'LOGIN_MISSING_USER_DATA';
  String get errorNoNetwork => 'LOGIN_ERROR_NO_NETWORK';
  String get errorNoInternet => 'LOGIN_ERROR_NO_INTERNET';
  String get errorConnectionFailed => 'LOGIN_ERROR_CONNECTION_FAILED';
  String get errorRequestTimeout => 'LOGIN_ERROR_REQUEST_TIMEOUT';
  String get errorServer => 'LOGIN_ERROR_SERVER';
  String get errorInvalidCredentials => 'LOGIN_ERROR_INVALID_CREDENTIALS';
}

class Home {
  const Home();

  String get quickActions => 'HOME_QUICK_ACTIONS';
  String get installationReport => 'HOME_INSTALLATION_REPORT';
  String get syncPending => 'HOME_SYNC_PENDING';
  String get myReports => 'HOME_MY_REPORTS';
  String get assigned => 'HOME_ASSIGNED';
  String get pendingApproval => 'HOME_PENDING_APPROVAL';
  String get approved => 'HOME_APPROVED';
  String get resubmissionNeeded => 'HOME_RESUBMISSION_NEEDED';
  String get syncPendingWarning => 'HOME_SYNC_PENDING_WARNING';
  String get pendingSyncDescription => 'HOME_PENDING_SYNC_DESCRIPTION';
  String get help => 'HOME_HELP';
  String get homeActionNotConnected => 'HOME_ACTION_NOT_CONNECTED';
}

class InstallationReportHome {
  const InstallationReportHome();

  String get installationReportHome => 'INSTALLATION_REPORT_HOME_TITLE';
  String get newReport => 'INSTALLATION_REPORT_HOME_NEW_REPORT';
  String get newReportDescription => 'INSTALLATION_REPORT_HOME_NEW_REPORT_DESCRIPTION';
  String get pendingApprovalDescription => 'INSTALLATION_REPORT_HOME_PENDING_APPROVAL_DESCRIPTION';
  String get resubmissionNeededSingleLine => 'INSTALLATION_REPORT_HOME_RESUBMISSION_NEEDED_SINGLE_LINE';
  String get resubmissionDescription => 'INSTALLATION_REPORT_HOME_RESUBMISSION_DESCRIPTION';
  String get approvedDescription => 'INSTALLATION_REPORT_HOME_APPROVED_DESCRIPTION';
  String get searchHealthFacility => 'INSTALLATION_REPORT_HOME_SEARCH_HEALTH_FACILITY';
  String get sortBy => 'INSTALLATION_REPORT_HOME_SORT_BY';
  String get submissionDate => 'INSTALLATION_REPORT_HOME_SUBMISSION_DATE';
  String get newestFirst => 'INSTALLATION_REPORT_HOME_NEWEST_FIRST';
  String get oldestFirst => 'INSTALLATION_REPORT_HOME_OLDEST_FIRST';
  String get startDate => 'INSTALLATION_REPORT_HOME_START_DATE';
  String get endDate => 'INSTALLATION_REPORT_HOME_END_DATE';
  String get state => 'INSTALLATION_REPORT_HOME_STATE';
  String get district => 'INSTALLATION_REPORT_HOME_DISTRICT';
  String get block => 'INSTALLATION_REPORT_HOME_BLOCK';
  String get pendingInstallation => 'INSTALLATION_REPORT_HOME_PENDING_INSTALLATION';
  String get startInstallationReport => 'INSTALLATION_REPORT_HOME_START_INSTALLATION_REPORT';
  String get resumeInstallationReport => 'INSTALLATION_REPORT_HOME_RESUME_INSTALLATION_REPORT';
  String get submitForApproval => 'INSTALLATION_REPORT_HOME_SUBMIT_FOR_APPROVAL';
  String get viewSummary => 'INSTALLATION_REPORT_HOME_VIEW_SUMMARY';
  String get viewDetails => 'INSTALLATION_REPORT_HOME_VIEW_DETAILS';
  String get resubmitForApproval => 'INSTALLATION_REPORT_HOME_RESUBMIT_FOR_APPROVAL';
  String get reportActionNotConnected => 'INSTALLATION_REPORT_HOME_REPORT_ACTION_NOT_CONNECTED';
}

class MachineForm {
  const MachineForm();

  String get machineReportTitle => 'MACHINE_FORM_MACHINE_REPORT_TITLE';
  String get poNumber => 'MACHINE_FORM_PO_NUMBER';
  String get enterPoNumber => 'MACHINE_FORM_ENTER_PO_NUMBER';
  String get machineSerialNumber => 'MACHINE_FORM_MACHINE_SERIAL_NUMBER';
  String get enterSerialNumber => 'MACHINE_FORM_ENTER_SERIAL_NUMBER';
  String get manufacturerInvoiceNumber => 'MACHINE_FORM_MANUFACTURER_INVOICE_NUMBER';
  String get enterInvoiceNumber => 'MACHINE_FORM_ENTER_INVOICE_NUMBER';
  String get machineCapacity => 'MACHINE_FORM_MACHINE_CAPACITY';
  String get enterCapacity => 'MACHINE_FORM_ENTER_CAPACITY';
  String get warrantyYears => 'MACHINE_FORM_WARRANTY_YEARS';
  String get enterYears => 'MACHINE_FORM_ENTER_YEARS';
  String get electricBoard => 'MACHINE_FORM_ELECTRIC_BOARD';
  String get rawMaterialDemo => 'MACHINE_FORM_RAW_MATERIAL_DEMO';
  String get photoWithEndUser => 'MACHINE_FORM_PHOTO_WITH_END_USER';
  String get takePhoto => 'MACHINE_FORM_TAKE_PHOTO';
  String get takeVideo => 'MACHINE_FORM_TAKE_VIDEO';
  String get camera => 'MACHINE_FORM_CAMERA';
  String get myFiles => 'MACHINE_FORM_MY_FILES';
  String get replace => 'MACHINE_FORM_REPLACE';
  String get trainedEndUser => 'MACHINE_FORM_TRAINED_END_USER';
  String get validateTrainingOtp => 'MACHINE_FORM_VALIDATE_TRAINING_OTP';
  String get validateInstallationOtp => 'MACHINE_FORM_VALIDATE_INSTALLATION_OTP';
  String get enterOtp => 'MACHINE_FORM_ENTER_OTP';
  String get verify => 'MACHINE_FORM_VERIFY';
  String get resendOtp => 'MACHINE_FORM_RESEND_OTP';
  String get otpRequired => 'MACHINE_FORM_OTP_REQUIRED';
  String get otpVerified => 'MACHINE_FORM_OTP_VERIFIED';
  String get otpResent => 'MACHINE_FORM_OTP_RESENT';
  String get mediaPickerError => 'MACHINE_FORM_MEDIA_PICKER_ERROR';
  String get cameraPermissionRequired => 'MACHINE_FORM_CAMERA_PERMISSION_REQUIRED';
  String get locationPermissionRequired => 'MACHINE_FORM_LOCATION_PERMISSION_REQUIRED';
  String get saveAsDraft => 'MACHINE_FORM_SAVE_AS_DRAFT';
  String get submitReport => 'MACHINE_FORM_SUBMIT_REPORT';
  String get dataSavedSuccessfully => 'MACHINE_FORM_DATA_SAVED_SUCCESSFULLY';
  String get dataSavedDescription => 'MACHINE_FORM_DATA_SAVED_DESCRIPTION';
  String get submittedSuccessfully => 'MACHINE_FORM_SUBMITTED_SUCCESSFULLY';
  String get submittedDescription => 'MACHINE_FORM_SUBMITTED_DESCRIPTION';
}

class AssetFlow {
  const AssetFlow();

  String get assetCountTitle => 'ASSET_FLOW_ASSET_COUNT_TITLE';
  String get chooseAssetCount => 'ASSET_FLOW_CHOOSE_ASSET_COUNT';
  String get batteries => 'ASSET_FLOW_BATTERIES';
  String get inverters => 'ASSET_FLOW_INVERTERS';
  String get panels => 'ASSET_FLOW_PANELS';
  String get selectAssetTypeTitle => 'ASSET_FLOW_SELECT_ASSET_TYPE_TITLE';
  String get selectAssetType => 'ASSET_FLOW_SELECT_ASSET_TYPE';
  String get specifications => 'ASSET_FLOW_SPECIFICATIONS';
  String get system => 'ASSET_FLOW_SYSTEM';
  String get totalCapacity => 'ASSET_FLOW_TOTAL_CAPACITY';
  String get unit => 'ASSET_FLOW_UNIT';
  String get details => 'ASSET_FLOW_DETAILS';
  String get warrantyStartDate => 'ASSET_FLOW_WARRANTY_START_DATE';
  String get warrantyDuration => 'ASSET_FLOW_WARRANTY_DURATION';
  String get brand => 'ASSET_FLOW_BRAND';
  String get serialNumber => 'ASSET_FLOW_SERIAL_NUMBER';
  String get scan => 'ASSET_FLOW_SCAN';
  String get scanSerialNumber => 'ASSET_FLOW_SCAN_SERIAL_NUMBER';
  String get supportingPhoto => 'ASSET_FLOW_SUPPORTING_PHOTO';
  String get capacity => 'ASSET_FLOW_CAPACITY';
  String get assetType => 'ASSET_FLOW_ASSET_TYPE';
  String get uploadImages => 'ASSET_FLOW_UPLOAD_IMAGES';
  String get uploadVideos => 'ASSET_FLOW_UPLOAD_VIDEOS';
  String get images => 'ASSET_FLOW_IMAGES';
  String get videos => 'ASSET_FLOW_VIDEOS';
  String get addAllImages => 'ASSET_FLOW_ADD_ALL_IMAGES';
  String get summary => 'ASSET_FLOW_SUMMARY';
  String get healthFacilityDetails => 'ASSET_FLOW_HEALTH_FACILITY_DETAILS';
  String get addMoreAssets => 'ASSET_FLOW_ADD_MORE_ASSETS';
}

class InstallationReport {
  const InstallationReport();

  String get installationCompletionReport => 'INSTALLATION_REPORT_INSTALLATION_COMPLETION_REPORT';
  String get completionInstructions => 'INSTALLATION_REPORT_COMPLETION_INSTRUCTIONS';
  String get systemParameters => 'INSTALLATION_REPORT_SYSTEM_PARAMETERS';
  String get bomSolarSystem => 'INSTALLATION_REPORT_BOM_SOLAR_SYSTEM';
  String get bomRms => 'INSTALLATION_REPORT_BOM_RMS';
  String get bomLoadWiring => 'INSTALLATION_REPORT_BOM_LOAD_WIRING';
  String get bomLuminaries => 'INSTALLATION_REPORT_BOM_LUMINARIES';
  String get installationImages => 'INSTALLATION_REPORT_INSTALLATION_IMAGES';
  String get dynamicFormNotConnected => 'INSTALLATION_REPORT_DYNAMIC_FORM_NOT_CONNECTED';
  String get uploadPrompt => 'INSTALLATION_REPORT_UPLOAD_PROMPT';
  String get uploadPdf => 'INSTALLATION_REPORT_UPLOAD_PDF';
  String get filePickerError => 'INSTALLATION_REPORT_FILE_PICKER_ERROR';
  String get rejectionReasons => 'INSTALLATION_REPORT_REJECTION_REASONS';
  String get incorrectInstallationDetails => 'INSTALLATION_REPORT_INCORRECT_INSTALLATION_DETAILS';
  String get rejectedSerialReason => 'INSTALLATION_REPORT_REJECTED_SERIAL_REASON';
  String get resubmit => 'INSTALLATION_REPORT_RESUBMIT';
}

class Scanner {
  const Scanner();

  String get scannerTitle => 'SCANNER_TITLE';
  String get scanInstruction => 'SCANNER_SCAN_INSTRUCTION';
  String get enterManualCode => 'SCANNER_ENTER_MANUAL_CODE';
  String get uploadFromGallery => 'SCANNER_UPLOAD_FROM_GALLERY';
  String get scannerUnavailable => 'SCANNER_UNAVAILABLE';
}
