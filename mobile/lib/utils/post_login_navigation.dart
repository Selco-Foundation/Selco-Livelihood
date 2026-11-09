import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/user_type/user_type.dart';
import '../model/response/responsemodel.dart';
import '../router/app_router.dart';
import 'role_login_resolver.dart';

/// E4H's post-login routing (`pages/login.dart` `_navigateAuthenticated`):
/// several modules → role selection, AMC only → AMC home, otherwise the
/// installation Home. Shared by Login and Welcome (auto-login).
void navigateAfterLogin(BuildContext context, UserRequest userRequest) {
  final resolution = RoleLoginResolver.resolveRoles(userRequest.roles);

  if (resolution.requiresSelection) {
    context.router.root.replaceAll(
      const [
        AuthenticatedRouteWrapper(children: [RoleSelectionRoute()])
      ],
    );
    return;
  }

  final directUserType = resolution.directUserType ?? USER_TYPES.FIELD_STAFF;
  // Nullable lookup: widget tests pump pages without this bloc.
  context.read<UserTypeBloc?>()?.add(
        UserTypeEvent.typeSelected(directUserType.name.toLowerCase()),
      );

  if (directUserType == USER_TYPES.AMC) {
    context.router.root.replaceAll(
      const [
        AuthenticatedRouteWrapper(children: [AmcHomeRoute()])
      ],
    );
    return;
  }

  context.router.root.replaceAll(
    const [
      AuthenticatedRouteWrapper(children: [HomeRoute()])
    ],
  );
}

/// E4H drawer "Home": re-resolves the user's module from their roles
/// (`widgets/navigation/drawer.dart`). Runs inside the authenticated router.
void navigateToModuleHome(BuildContext context, List<Roles> roles) {
  final resolution = RoleLoginResolver.resolveRoles(roles);

  if (resolution.requiresSelection) {
    context.router.replaceAll([const RoleSelectionRoute()]);
    return;
  }

  final userType = resolution.directUserType ?? USER_TYPES.FIELD_STAFF;
  context.read<UserTypeBloc?>()?.add(
        UserTypeEvent.typeSelected(userType.name.toLowerCase()),
      );

  if (userType == USER_TYPES.AMC) {
    context.router.replaceAll([const AmcHomeRoute()]);
  } else {
    context.router.replaceAll([const HomeRoute()]);
  }
}
