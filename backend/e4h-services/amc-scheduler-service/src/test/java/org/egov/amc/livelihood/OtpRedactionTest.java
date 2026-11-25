package org.egov.amc.livelihood;

import org.egov.amc.web.models.Otp;
import org.egov.amc.web.models.OtpResponse;
import org.egov.amc.web.models.VisitReport;
import org.egov.amc.web.models.VisitReportDocument;
import org.egov.common.contract.response.ResponseInfo;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class OtpRedactionTest {

    @Test
    void otpResponseLosesCodePhoneAndTokenId() {
        ResponseInfo info = mock(ResponseInfo.class);
        OtpResponse response = OtpResponse.builder()
                .responseInfo(info)
                .otp(Otp.builder().otp("4821").uuid("token-1").identity("9876543210")
                        .tenantId("livelihood").validationSuccessful(true).build())
                .build();

        OtpResponse redacted = OtpRedaction.withoutCode(response);

        assertSame(info, redacted.getResponseInfo());
        assertNull(redacted.getOtp().getOtp());
        assertNull(redacted.getOtp().getUuid());
        assertNull(redacted.getOtp().getIdentity());
        assertEquals("livelihood", redacted.getOtp().getTenantId());
        assertTrue(redacted.getOtp().isValidationSuccessful());
        assertEquals("4821", response.getOtp().getOtp(), "the original response must not be changed");
    }

    @Test
    void otpResponseNullSafe() {
        assertNull(OtpRedaction.withoutCode((OtpResponse) null));
        OtpResponse noOtp = OtpResponse.builder().build();
        assertNull(OtpRedaction.withoutCode(noOtp).getOtp());
    }

    @Test
    void visitReportLosesOnlyTheCode() {
        Map<String, Object> responses = Map.of("neVoltagePcuOutput", "5");
        List<VisitReportDocument> documents = List.of(new VisitReportDocument());
        Map<String, Object> additional = Map.of("systemStatus", Map.of("isSystemFunctional", true));
        VisitReport report = VisitReport.builder()
                .schemaCode("AMC_Report").version("1").submittedBy("fs-uuid").submittedAt(10L)
                .otpReference("4821").otpVerifiedAt(20L)
                .responses(responses).documents(documents).additionalDetails(additional)
                .build();

        VisitReport redacted = OtpRedaction.withoutCode(report);

        assertNull(redacted.getOtpReference());
        assertEquals("AMC_Report", redacted.getSchemaCode());
        assertEquals("1", redacted.getVersion());
        assertEquals("fs-uuid", redacted.getSubmittedBy());
        assertEquals(10L, redacted.getSubmittedAt());
        assertEquals(20L, redacted.getOtpVerifiedAt());
        assertSame(responses, redacted.getResponses());
        assertSame(documents, redacted.getDocuments());
        assertSame(additional, redacted.getAdditionalDetails());
        assertEquals("4821", report.getOtpReference(), "the original report must not be changed");
    }

    @Test
    void visitReportNullSafe() {
        assertNull(OtpRedaction.withoutCode((VisitReport) null));
    }

    @Test
    void maskPhoneKeepsLastFourDigits() {
        assertEquals("******3210", OtpRedaction.maskPhone("9876543210"));
        assertEquals("******3210", OtpRedaction.maskPhone(" 9876543210 "));
        assertEquals("****", OtpRedaction.maskPhone("123"));
        assertNull(OtpRedaction.maskPhone(null));
        assertFalse(OtpRedaction.maskPhone("9876543210").contains("98765"));
    }
}
