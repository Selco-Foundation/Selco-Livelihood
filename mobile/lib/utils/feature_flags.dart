/// TEMPORARY: the backend OTP endpoints (`_generate-otp`/`_validate-otp`/
/// `_resend-otp`) currently 401 through the gateway, so OTP can't actually
/// be verified right now. Set this back to `false` once OTP verification is
/// confirmed working end-to-end again — it gates the Submit button in
/// `lib/pages/overall_asset_summary.dart` and `lib/pages/machine_form.dart`
/// so a failed/unavailable OTP doesn't block testing the rest of the
/// submission pipeline (installation images, BOM, assets, workflow
/// transition).
const bool otpVerificationBypassed = true;
