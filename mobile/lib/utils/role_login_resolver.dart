// ignore_for_file: constant_identifier_names, camel_case_types

import '../model/response/responsemodel.dart';

/// Ported from E4H `lib/utils/utils.dart` (`USER_TYPES`). Kept with E4H's
/// exact values because AMC caches/bookmarks are keyed by `USER_TYPES.AMC.name`.
enum USER_TYPES { SUPERVISOR, FIELD_STAFF, AMC, ASSESSOR }

const amcFieldStaffRoleCode = 'AMC_FIELD_STAFF';

/// TEMP-AMC-ACCESS: while `true`, field staff (`INSTALLATION_REPORT_PART_A_EDITOR`)
/// are treated as also having `AMC_FIELD_STAFF`, so they get the role
/// selection screen (Installation / AMC) after login — for testing AMC before
/// the AMC role is assigned to users. Set to `false` (or delete it) once
/// roles are assigned properly. Mutable only so tests can switch it.
bool tempGrantAmcToFieldStaff = true;
const installationReportPartAEditorRoleCode =
    'INSTALLATION_REPORT_PART_A_EDITOR';

/// Ported from E4H `lib/utils/role_login_resolver.dart`. E4H also resolves
/// a supervisor (Part B) installation option and an Assessment module; this
/// app has neither flow yet, so only the Installation (Part A) and AMC
/// options are resolved here.
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
    final hasAmc = codes.contains(amcFieldStaffRoleCode) ||
        (tempGrantAmcToFieldStaff && isFieldStaff);
    return [
      if (isFieldStaff) RoleSelectionOption.staff,
      if (hasAmc) RoleSelectionOption.amc,
    ];
  }
}
