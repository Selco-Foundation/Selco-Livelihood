import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:flutter/material.dart';

/// Login-only input exposing native autofill without modifying DIGIT packages.
class LoginCredentialInput extends StatefulWidget {
  const LoginCredentialInput({
    super.key,
    required this.controller,
    required this.autofillEnabled,
    required this.onChanged,
    this.isPassword = false,
    this.errorMessage,
    this.focusNode,
  });

  final TextEditingController controller;
  final FocusNode? focusNode;
  final bool autofillEnabled;
  final bool isPassword;
  final String? errorMessage;
  final ValueChanged<String> onChanged;

  @override
  State<LoginCredentialInput> createState() => _LoginCredentialInputState();
}

class _LoginCredentialInputState extends State<LoginCredentialInput> {
  bool _passwordVisible = false;
  FocusNode? _internalFocusNode;
  FocusNode get _focusNode =>
      widget.focusNode ?? (_internalFocusNode ??= FocusNode());

  @override
  void dispose() {
    _internalFocusNode?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorTheme;
    OutlineInputBorder border(Color color,
            [double width = Base.defaultBorderWidth]) =>
        OutlineInputBorder(
          borderRadius: Base.radius,
          borderSide: BorderSide(color: color, width: width),
        );

    final screenSize = MediaQuery.sizeOf(context);
    final isMobile = AppView.isMobileView(screenSize);
    final minWidth = isMobile
        ? BaseConstants.mobileInputMinWidth
        : BaseConstants.desktopInputMinWidth;
    final width = isMobile
        ? screenSize.width
        : AppView.isTabletView(screenSize)
            ? BaseConstants.tabInputMaxWidth
            : BaseConstants.desktopInputMaxWidth;
    final obscureText = widget.isPassword && !_passwordVisible;
    final error = widget.errorMessage;

    return Container(
      width: width,
      constraints: BoxConstraints(minWidth: minWidth),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          TextFormField(
            controller: widget.controller,
            focusNode: _focusNode,
            autofillHints: widget.autofillEnabled
                ? [
                    widget.isPassword
                        ? AutofillHints.password
                        : AutofillHints.username
                  ]
                : null,
            obscureText: obscureText,
            autocorrect: false,
            enableSuggestions: false,
            keyboardType: TextInputType.text,
            textInputAction:
                widget.isPassword ? TextInputAction.done : TextInputAction.next,
            onChanged: widget.onChanged,
            onTapOutside: (_) => _focusNode.unfocus(),
            style: theme.digitTextTheme(context).bodyS.copyWith(
                  color: colors.text.primary,
                  decoration: TextDecoration.none,
                  fontWeight: obscureText ? FontWeight.w900 : null,
                ),
            decoration: InputDecoration(
              counterText: '',
              hoverColor: colors.generic.transparent,
              constraints: BoxConstraints(
                minHeight: Base.height,
                maxHeight: Base.height,
                minWidth: minWidth,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: spacer3,
                vertical: spacer2,
              ),
              filled: true,
              fillColor: colors.generic.transparent,
              enabledBorder: border(
                error != null ? colors.alert.error : colors.generic.inputBorder,
                error != null ? Base.errorBorderWidth : Base.defaultBorderWidth,
              ),
              focusedBorder: BaseConstants.focusedBorder,
              disabledBorder: BaseConstants.disabledBorder,
              suffixIconConstraints: const BoxConstraints(maxHeight: spacer6),
              suffixIconColor: colors.text.secondary,
              suffixIcon: widget.isPassword
                  ? InkWell(
                      hoverColor: colors.generic.transparent,
                      splashColor: colors.generic.transparent,
                      highlightColor: colors.generic.transparent,
                      onTap: () {
                        _focusNode.requestFocus();
                        setState(() => _passwordVisible = !_passwordVisible);
                      },
                      child: Padding(
                        padding: const EdgeInsets.only(right: spacer2),
                        child: Icon(
                          _passwordVisible
                              ? Icons.visibility_off
                              : Icons.visibility,
                          size: BaseConstants.suffixIconSize,
                        ),
                      ),
                    )
                  : null,
            ),
          ),
          if (error != null) ...[
            const SizedBox(height: spacer1),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: spacer1 / 2),
                  child: SizedBox(
                    height: spacer4,
                    width: spacer4,
                    child: Icon(Icons.info,
                        color: colors.alert.error,
                        size: BaseConstants.errorIconSize),
                  ),
                ),
                const SizedBox(width: spacer1),
                Expanded(
                  child: Text(
                    error.length > 256
                        ? '${error.substring(0, 256)}...'
                        : error,
                    style: theme.digitTextTheme(context).bodyS.copyWith(
                          color: colors.alert.error,
                        ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
