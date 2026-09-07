import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/widgets/helper_widget/digit_profile.dart';
import 'package:digit_ui_components/widgets/molecules/hamburger.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../blocs/auth/authbloc.dart';
import '../../router/app_router.dart';
import '../../utils/extensions.dart';
import '../../utils/i18_key_constants.dart' as i18;
import '../privacy_policy/policy_dialog_launcher.dart';

/// The hamburger-menu side drawer, ported from E4H's `CustomDrawer`
/// (`lib/widgets/navigation/drawer.dart`). Trimmed for this app: no
/// Profile page, role-based routing, or offline-connectivity popup, since
/// this app has neither multiple modules nor a dedicated profile screen.
class CustomDrawer extends StatelessWidget {
  const CustomDrawer({super.key});

  @override
  Widget build(BuildContext context) => BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) => _DrawerContent(state: state),
      );
}

class _DrawerContent extends StatelessWidget {
  const _DrawerContent({required this.state});

  final AuthState state;

  void _closeDrawer(BuildContext context) {
    Navigator.of(context, rootNavigator: true).pop();
  }

  void _goHome(BuildContext context) {
    _closeDrawer(context);
    context.router.replaceAll([const HomeRoute()]);
  }

  void _logOut(BuildContext context) {
    context.read<AuthBloc>().add(const AuthEvent.logout());
    context.router.root.replaceAll(
      const [
        UnauthenticatedRouteWrapper(children: [WelcomeRoute()])
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: kToolbarHeight),
      // DIGIT's fixed-width SideBar does not flex long item labels. Keep its
      // E4H layout while constraining drawer text enough to avoid clipping.
      child: MediaQuery.withClampedTextScaling(
        maxScaleFactor: 0.87,
        child: SideBar(
          profile: state.maybeMap(
            authenticated: (value) => ProfileWidget(
              leading: value.userRequest.uuid.isEmpty
                  ? null
                  : QrImageView(
                      key: ValueKey(
                          'drawer-profile-qr-${value.userRequest.uuid}'),
                      data: value.userRequest.uuid,
                      version: QrVersions.auto,
                      size: 150.0,
                    ),
              title: value.userRequest.name ?? '',
              description: value.userRequest.mobileNumber ?? '',
            ),
            orElse: () => null,
          ),
          sidebarItems: [
            SidebarItem(
              title: context.translate(i18.common.home),
              icon: Icons.home,
              onPressed: () => _goHome(context),
            ),
            SidebarItem(
              title: context.translate(i18.login.privacyPolicy),
              icon: Icons.privacy_tip_outlined,
              onPressed: () {
                _closeDrawer(context);
                showPrivacyPolicy(context);
              },
            ),
            SidebarItem(
              title: context.translate(i18.login.termsOfUse),
              icon: Icons.policy_outlined,
              onPressed: () {
                _closeDrawer(context);
                showTermsAndConditions(context);
              },
            ),
          ],
          logOutDigitButtonLabel: context.translate(i18.common.logout),
          onLogOut: () => _logOut(context),
          footer: const PoweredByDigit(version: ''),
        ),
      ),
    );
  }
}
