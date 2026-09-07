import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Test-only seam: `webview_flutter` has no platform implementation under
/// `flutter test` (no device/emulator), so constructing a real
/// `WebViewController` there throws. When set, this replaces the WebView
/// body with a plain placeholder instead. Tests should restore it to null
/// via `addTearDown`.
@visibleForTesting
WidgetBuilder? debugPolicyWebViewBodyBuilder;

class PolicyWebViewDialog extends StatefulWidget {
  const PolicyWebViewDialog({super.key, required this.title, required this.uri});

  final String title;
  final Uri uri;

  @override
  State<PolicyWebViewDialog> createState() => _PolicyWebViewDialogState();
}

class _PolicyWebViewDialogState extends State<PolicyWebViewDialog> {
  WebViewController? _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (debugPolicyWebViewBodyBuilder == null) {
      _controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setNavigationDelegate(NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _isLoading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
          },
        ))
        ..loadRequest(widget.uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bodyBuilder = debugPolicyWebViewBodyBuilder;

    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      child: SizedBox(
        width: double.maxFinite,
        height: double.maxFinite,
        child: Column(
          children: [
            AppBar(
              title: Text(widget.title),
              automaticallyImplyLeading: false,
              actions: [
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            Expanded(
              child: bodyBuilder != null
                  ? bodyBuilder(context)
                  : Stack(
                      children: [
                        WebViewWidget(controller: _controller!),
                        if (_isLoading)
                          const Center(child: CircularProgressIndicator()),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
