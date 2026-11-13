import 'package:digit_ui_components/theme/spacers.dart';
import 'package:flutter/material.dart';

import '../../utils/amc/amc_module_readiness.dart';
import '../../utils/extensions.dart';
import '../../utils/i18_key_constants.dart' as i18;

/// E4H `MdmsGate(module: MdmsModule.amc, load: ...)`: blocks the AMC home
/// behind a non-dismissible "loading app data" dialog until the AMC form
/// schema has loaded; a failure shows "Something went wrong" + Retry and
/// keeps the user out. Readiness lasts for the auth session
/// ([AmcModuleReadiness]).
class AmcMdmsGate extends StatefulWidget {
  final Widget child;
  final Future<void> Function() load;

  const AmcMdmsGate({
    super.key,
    required this.child,
    required this.load,
  });

  @override
  State<AmcMdmsGate> createState() => _AmcMdmsGateState();
}

class _AmcMdmsGateState extends State<AmcMdmsGate> {
  bool _loading = false;
  bool _ready = false;
  bool _failed = false;
  DialogRoute<void>? _dialog;

  @override
  void initState() {
    super.initState();
    _ready = AmcModuleReadiness.isReady;
    if (_ready) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _load();
    });
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _failed = false;
    });
    final navigator = Navigator.of(context, rootNavigator: true);
    final dialog = DialogRoute<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => PopScope(
        canPop: false,
        child: Dialog(
          key: const ValueKey('amc-mdms-loading-dialog'),
          child: Padding(
            padding: const EdgeInsets.all(spacer6),
            child: Row(children: [
              const CircularProgressIndicator(),
              const SizedBox(width: spacer4),
              Flexible(
                  child: Text(
                      context.translate(i18.amcCommon.loadingAppData))),
            ]),
          ),
        ),
      ),
    );
    _dialog = dialog;
    navigator.push(dialog);
    var succeeded = false;
    try {
      await widget.load();
      succeeded = true;
      if (mounted) AmcModuleReadiness.markReady();
    } catch (_) {
      // The auth interceptor handles expired sessions. Other errors stay retryable.
    } finally {
      _closeDialog();
      if (mounted) {
        setState(() {
          _loading = false;
          _ready = succeeded;
          _failed = !succeeded;
        });
      }
    }
  }

  void _closeDialog() {
    final dialog = _dialog;
    _dialog = null;
    if (dialog?.isActive == true) dialog!.navigator?.removeRoute(dialog);
  }

  @override
  void dispose() {
    // Removal can coincide with the auth router replacing the home route.
    final dialog = _dialog;
    _dialog = null;
    if (dialog != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (dialog.isActive) dialog.navigator?.removeRoute(dialog);
      });
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Stack(
        fit: StackFit.expand,
        children: [
          IgnorePointer(ignoring: !_ready, child: widget.child),
          if (_failed)
            Material(
              color: Theme.of(context).scaffoldBackgroundColor,
              child: Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(context.translate(i18.amcCommon.somethingWentWrong)),
                  const SizedBox(height: spacer4),
                  TextButton(
                    key: const ValueKey('amc-mdms-retry'),
                    onPressed: _load,
                    child: Text(context.translate(i18.amcCommon.retry)),
                  ),
                ]),
              ),
            ),
        ],
      );
}
