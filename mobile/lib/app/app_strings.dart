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
