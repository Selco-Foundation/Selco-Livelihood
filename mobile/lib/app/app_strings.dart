abstract final class AppStrings {
  static const appName = 'Livelihood';
  static const appDescriptor = 'Asset Management';

  static const welcomeTitle = 'Welcome!';
  static const welcomeDescription =
      'Through this application you will be able to:';
  static const proceed = 'Proceed';

  static const welcomeItems = <WelcomeItemCopy>[
    WelcomeItemCopy(
      title: 'View Facilities',
      description:
          'You can view the facilities assigned to you for installation',
      imagePath: 'assets/images/welcome_1.png',
    ),
    WelcomeItemCopy(
      title: 'Create Reports',
      description:
          'Create installation reports for the facilities assigned to you (online and offline)',
      imagePath: 'assets/images/welcome_2.png',
    ),
    WelcomeItemCopy(
      title: 'Save Reports',
      description:
          'Save installation reports offline until ready for submission',
      imagePath: 'assets/images/welcome_3.png',
    ),
    WelcomeItemCopy(
      title: 'Submit for Approval',
      description:
          'Save installation reports offline until ready for submission',
      imagePath: 'assets/images/welcome_4.png',
    ),
    WelcomeItemCopy(
      title: 'Edit Reports',
      description:
          'Save installation reports offline until ready for submission',
      imagePath: 'assets/images/welcome_5.png',
    ),
  ];

  static const login = 'Login';
  static const userId = 'User ID';
  static const password = 'Password';
  static const requiredMessage = 'This field is required';
  static const consentPrefix = 'I agree to the';
  static const privacyPolicy = 'Privacy Policy';
  static const consentConnector = 'and';
  static const termsOfUse = 'Terms of Use';
  static const forgotPassword = 'Forgot Password';
  static const forgotPasswordNotConnected =
      'Forgot password is not connected yet.';
  static const policyNotConnected =
      'This document will be connected in a future version.';
  static const poweredBy = 'Powered by';

  static const quickActions = 'QUICK ACTIONS';
  static const installationReport = 'Installation Report';
  static const syncPending = 'Sync/Pending';
  static const myReports = 'MY REPORTS';
  static const assigned = 'Assigned';
  static const pendingApproval = 'Pending Approval';
  static const approved = 'Approved';
  static const resubmissionNeeded = 'Resubmission\nNeeded';
  static const syncPendingWarning = 'Sync/ Pending!';
  static const pendingSyncDescription = 'There are 5 records yet to be synced.';
  static const help = 'Help';
  static const homeActionNotConnected = 'This action is not connected yet.';

  static const installationReportHome = 'Installation Report';
  static const newReport = 'New Report';
  static const newReportDescription =
      'View assigned end users, search, and create an installation report.';
  static const pendingApprovalDescription =
      'Reports submitted (synced or not) and waiting on the Reviewer.';
  static const resubmissionNeededSingleLine = 'Resubmission Needed';
  static const resubmissionDescription =
      'Rejected by Reviewer — action needed before re-submitting.';
  static const approvedDescription = 'Fully approved installation reports.';
  static const searchHealthFacility = 'Search Health Facility';
  static const sort = 'Sort';
  static const sortBy = 'Sort By';
  static const submissionDate = 'Submission Date';
  static const newestFirst = 'Newest First';
  static const oldestFirst = 'Oldest First';
  static const clear = 'Clear';
  static const back = 'Back';
  static const status = 'Status';
  static const startDate = 'Start Date';
  static const endDate = 'End Date';
  static const state = 'State';
  static const district = 'District';
  static const block = 'Block';
  static const pendingInstallation = 'Pending Installation';
  static const startInstallationReport = 'Start Installation Report';
  static const resumeInstallationReport = 'Resume Installation Report';
  static const submitForApproval = 'Submit For Approval';
  static const viewSummary = 'View Summary';
  static const viewDetails = 'View Details';
  static const resubmitForApproval = 'Resubmit For Approval';
  static const reportActionNotConnected =
      'This report action is not connected yet.';

  static const machineReportTitle = 'Installation Report for Machine';
  static const poNumber = 'PO Number';
  static const enterPoNumber = 'Enter PO Number';
  static const machineSerialNumber = 'Machine Serial Number';
  static const enterSerialNumber = 'Enter Serial Number';
  static const manufacturerInvoiceNumber = 'Manufacturer Invoice Number';
  static const enterInvoiceNumber = 'Enter Invoice Number';
  static const machineCapacity = 'Machine Specifications/Motor Capacity';
  static const enterCapacity = 'Enter Capacity';
  static const warrantyYears = 'Warranty (Years)';
  static const enterYears = 'Enter Years';
  static const electricBoard = 'Electric Board';
  static const rawMaterialDemo = 'Demo test with Raw Material';
  static const photoWithEndUser = 'Photo with End User';
  static const takePhoto = 'Take Photo';
  static const takeVideo = 'Take Video';
  static const camera = 'Camera';
  static const myFiles = 'My Files';
  static const replace = 'Replace';
  static const trainedEndUser = 'Trained End User';
  static const yes = 'Yes';
  static const no = 'No';
  static const validateTrainingOtp = 'Enter OTP to Validate Training';
  static const enterOtp = 'Enter OTP';
  static const verify = 'Verify';
  static const resendOtp = 'Resend OTP';
  static const otpRequired = 'Enter an OTP before verification.';
  static const otpVerified = 'OTP verified successfully.';
  static const otpResent = 'A new OTP has been requested.';
  static const mediaPickerError = 'Could not open the media picker.';
  static const saveAsDraft = 'Save Draft';
  static const submitReport = 'Submit';
  static const dataSavedSuccessfully = 'Data Saved Successfully';
  static const dataSavedDescription =
      'The installation report has been saved successfully.';
  static const submittedSuccessfully = 'Submitted Successfully';
  static const submittedDescription =
      'The installation report has been submitted successfully.';
  static const home = 'Home';
}

class WelcomeItemCopy {
  const WelcomeItemCopy({
    required this.title,
    required this.description,
    required this.imagePath,
  });

  final String title;
  final String description;
  final String imagePath;
}
