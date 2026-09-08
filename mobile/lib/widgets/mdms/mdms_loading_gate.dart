import 'package:digit_ui_components/digit_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../blocs/app_init/app_init.dart';
import '../../utils/extensions.dart';
import '../../utils/i18_key_constants.dart' as i18;

/// Gates [child] (Home's body content) on the MDMS v1 asset-registry fetch:
/// E4H's own non-dismissible blocking dialog while it loads (same shape,
/// ported verbatim — `PopScope(canPop: false)` + `Dialog` + spinner/text
/// row), a full retry screen if it fails hard, otherwise the content
/// renders normally.
///
/// Reads `AppInitialization` as nullable: most widget tests pump `HomePage`
/// (directly or via the authenticated route) without providing that bloc —
/// `isar` is always null in those tests — and a missing provider must be a
/// no-op here (render [child] unchanged) rather than a crash.
class MdmsLoadingGate extends StatefulWidget {
  const MdmsLoadingGate({super.key, required this.child});

  final Widget child;

  @override
  State<MdmsLoadingGate> createState() => _MdmsLoadingGateState();
}

class _MdmsLoadingGateState extends State<MdmsLoadingGate> {
  AppInitialization? _appInit;
  bool _dialogShown = false;

  @override
  void initState() {
    super.initState();
    final appInit = context.read<AppInitialization?>();
    _appInit = appInit;
    if (appInit != null && appInit.state is Defaulted) {
      appInit.add(const InitEvent.fetchMdms());
    }
  }

  void _postFrame(VoidCallback fn) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) fn();
    });
  }

  void _openLoadingDialog() {
    if (_dialogShown) return;
    _dialogShown = true;
    _postFrame(() {
      if (!mounted) return;
      showDialog<void>(
        context: context,
        barrierDismissible: false,
        useRootNavigator: true,
        builder: (_) => PopScope(
          canPop: false,
          child: Dialog(
            key: const ValueKey('mdms-loading-dialog'),
            insetPadding: const EdgeInsets.all(24),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(width: 16),
                  Flexible(
                    child: Text(context.translate(i18.common.loading)),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    });
  }

  void _closeLoadingDialog() {
    if (!_dialogShown) return;
    _dialogShown = false;
    _postFrame(() {
      if (!mounted) return;
      Navigator.of(context, rootNavigator: true).pop();
    });
  }

  @override
  Widget build(BuildContext context) {
    final appInit = _appInit;
    if (appInit == null) return widget.child;

    return BlocConsumer<AppInitialization, InitState>(
      bloc: appInit,
      listener: (context, state) {
        state.maybeWhen(
          loadingMdms: (_) => _openLoadingDialog(),
          orElse: _closeLoadingDialog,
        );
      },
      builder: (context, state) {
        return state.maybeWhen(
          mdmsError: (_, message) => _MdmsErrorView(
            message: message,
            onRetry: () => appInit.add(const InitEvent.fetchMdms()),
          ),
          orElse: () => widget.child,
        );
      },
    );
  }
}

class _MdmsErrorView extends StatelessWidget {
  const _MdmsErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(spacer4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48),
            const SizedBox(height: spacer3),
            Text(
              context.translate(message),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: spacer4),
            DigitButton(
              key: const ValueKey('mdms-retry-button'),
              label: context.translate(i18.common.retry),
              type: DigitButtonType.primary,
              size: DigitButtonSize.large,
              onPressed: onRetry,
            ),
          ],
        ),
      ),
    );
  }
}
