// ignore_for_file: constant_identifier_names, camel_case_types

import '../model/response/responsemodel.dart';

/// Values must not change: AMC caches/bookmarks are keyed by
/// `USER_TYPES.AMC.name`.
enum USER_TYPES { SUPERVISOR, FIELD_STAFF, AMC, ASSESSOR }

const amcFieldStaffRoleCode = 'AMC_FIELD_STAFF';

const installationReportPartAEditorRoleCode =
    'INSTALLATION_REPORT_PART_A_EDITOR';

/// Only the Installation (Part A) and AMC options are resolved here; this
/// app has no supervisor (Part B) installation or Assessment flow yet.
enum RoleSelectionOption { staff, amc }

extension RoleSelectionOptionX on RoleSelectionOption {
  String get label {
    switch (this) {
      case RoleSelectionOption.staff:
        return 'Staff';
      case RoleSelectionOption.amc:
        return 'AMC';
    }
  }

  String get userTypeValue {
    switch (this) {
      case RoleSelectionOption.staff:
        return USER_TYPES.FIELD_STAFF.name.toLowerCase();
      case RoleSelectionOption.amc:
        return USER_TYPES.AMC.name.toLowerCase();
    }
  }

  bool get isAmc => this == RoleSelectionOption.amc;

  String get moduleLabel {
    switch (this) {
      case RoleSelectionOption.staff:
        return 'Installation';
      case RoleSelectionOption.amc:
        return 'AMC';
    }
  }
}

class RoleLoginResolution {
  const RoleLoginResolution._({
    required this.requiresSelection,
    required this.selectionOptions,
    this.directUserType,
  });

  const RoleLoginResolution.direct(USER_TYPES userType)
      : this._(
          requiresSelection: false,
          selectionOptions: const [],
          directUserType: userType,
        );

  const RoleLoginResolution.selection(List<RoleSelectionOption> options)
      : this._(
          requiresSelection: true,
          selectionOptions: options,
        );

  final bool requiresSelection;
  final USER_TYPES? directUserType;
  final List<RoleSelectionOption> selectionOptions;
}

class RoleLoginResolver {
  const RoleLoginResolver._();

  /// Whether any role grants access to a module this app supports. Login is
  /// rejected otherwise (see `AuthBloc`).
  static bool hasSupportedRole(Iterable<String?> roleCodes) =>
      _moduleOptions(roleCodes).isNotEmpty;

  static RoleLoginResolution resolveRoles(List<Roles> roles) {
    return resolveRoleCodes(roles.map((role) => role.code));
  }

  static RoleLoginResolution resolveRoleCodes(Iterable<String?> roleCodes) {
    final moduleOptions = _moduleOptions(roleCodes);

    if (moduleOptions.length > 1) {
      return RoleLoginResolution.selection(moduleOptions);
    }

    if (moduleOptions.length == 1) {
      switch (moduleOptions.single) {
        case RoleSelectionOption.staff:
          return const RoleLoginResolution.direct(USER_TYPES.FIELD_STAFF);
        case RoleSelectionOption.amc:
          return const RoleLoginResolution.direct(USER_TYPES.AMC);
      }
    }

    return const RoleLoginResolution.direct(USER_TYPES.FIELD_STAFF);
  }

  static List<RoleSelectionOption> _moduleOptions(Iterable<String?> roleCodes) {
    final codes = roleCodes.whereType<String>().toSet();
    final isFieldStaff = codes.contains(installationReportPartAEditorRoleCode);
    // Only `AMC_FIELD_STAFF` opens AMC: the PRD's one mobile AMC role.
    final hasAmc = codes.contains(amcFieldStaffRoleCode);
    return [
      if (isFieldStaff) RoleSelectionOption.staff,
      if (hasAmc) RoleSelectionOption.amc,
    ];
  }
}
