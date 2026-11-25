package org.egov.amc.livelihood;

import org.egov.amc.web.models.Otp;
import org.egov.amc.web.models.OtpResponse;
import org.egov.amc.web.models.VisitReport;

/**
 * Keeps the end user's AMC service completion code out of anything the field staff can read
 * (API responses, saved reports, visit history) and out of the logs.
 *
 * <p>The code proves the end user confirmed the visit, so the field staff must only ever get it from
 * the end user. E4H stored it on the visit report, returned it from {@code _resend_otp} and logged it
 * (LLD 07 §1 point 5, §6.1).
 */
public final class OtpRedaction {

    private OtpRedaction() {
    }

    /** The egov-otp response without the code, the phone number it was sent to, or the token id. */
    public static OtpResponse withoutCode(OtpResponse response) {
        if (response == null) {
            return null;
        }
        Otp otp = response.getOtp();
        Otp redacted = otp == null ? null : Otp.builder()
                .tenantId(otp.getTenantId())
                .validationSuccessful(otp.isValidationSuccessful())
                .build();
        return OtpResponse.builder()
                .responseInfo(response.getResponseInfo())
                .otp(redacted)
                .build();
    }

    /** A copy of the report with the typed code removed; everything else, incl. otpVerifiedAt, is kept. */
    public static VisitReport withoutCode(VisitReport report) {
        if (report == null) {
            return null;
        }
        return VisitReport.builder()
                .schemaCode(report.getSchemaCode())
                .version(report.getVersion())
                .submittedBy(report.getSubmittedBy())
                .submittedAt(report.getSubmittedAt())
                .otpReference(null)
                .otpVerifiedAt(report.getOtpVerifiedAt())
                .responses(report.getResponses())
                .documents(report.getDocuments())
                .additionalDetails(report.getAdditionalDetails())
                .build();
    }

    /** For logs: only the last four digits of a phone number. */
    public static String maskPhone(String phone) {
        if (phone == null) {
            return null;
        }
        String trimmed = phone.trim();
        if (trimmed.length() <= 4) {
            return "****";
        }
        return "******" + trimmed.substring(trimmed.length() - 4);
    }
}
