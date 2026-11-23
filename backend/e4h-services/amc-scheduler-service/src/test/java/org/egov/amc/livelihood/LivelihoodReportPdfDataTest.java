package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.egov.amc.livelihood.LivelihoodReportPdfData.Input;
import org.egov.amc.livelihood.LivelihoodReportPdfData.Step;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.Facility;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.VisitReport;
import org.egov.amc.web.models.VisitReportDocument;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LivelihoodReportPdfDataTest {

    static final String PHOTO = "b149e54d-3468-4a84-ba15-c914cdb33787"; // an image on dev filestore

    static VisitReport report() {
        Map<String, Object> responses = new LinkedHashMap<>();
        responses.put("serviceBy", "Ravi \"RK\" Kumar");
        responses.put("pcuPriority", "SOLAR_BATTERY_GRID");
        responses.put("obsPanelsClean", "YES");
        responses.put("obsMmsRusting", "NA");
        responses.put("neVoltagePcuOutput", 3.0);
        responses.put("solarSpdStatus", "WORKING");
        responses.put("vendorRemarks", "Cleaned panels [all]\nre-tightened {AJB}");
        Map<String, Object> additional = Map.of("systemStatus", Map.of("isSystemInUse", true, "isSystemFunctional", false));
        return VisitReport.builder().responses(responses).additionalDetails(additional)
                .documents(List.of(
                        VisitReportDocument.builder().documentType("AMC_VERIFICATION_PHOTO").fileStoreId(PHOTO).build(),
                        VisitReportDocument.builder().documentType("AMC_PHOTO_NE_PCU").fileStoreId(PHOTO).build(),
                        VisitReportDocument.builder().documentType("AMC_PHOTO_NE_PCU").fileStoreId("second").build()))
                .build();
    }

    static Input input(VisitReport report, Step step) {
        ScheduledVisit visit = ScheduledVisit.builder().id("a32dbef8-70c8-38b7-adce-8a451c7ae7c2").tenantId("livelihood")
                .visitNumber(1).status("SCHEDULED").scheduledDate(AmcScheduleAndPlanTest.day(2027, 5, 16))
                .additionalDetails(Map.of("autoApproval", Map.of("rules", List.of(
                        Map.of("label", "Neutral to earth voltage at PCU output", "reading", 9, "unit", "V",
                                "acceptedRange", "less than 7 V", "passed", false),
                        Map.of("label", "Inverter output voltage", "reading", 230, "unit", "V",
                                "acceptedRange", "215 to 250 V", "passed", true)))))
                .build();
        Facility facility = Facility.builder().facilityName("Nipe Brahma").facilityPocPhone("9678335201")
                .boundaryCode("INDIA_ASSAM_BAKSA_DHAMDHAMA_ED/2026/0039").build();
        AmcConfiguration cfg = AmcConfiguration.builder().durationMonths(12).visitFrequencyMonths(6)
                .configurationStartDate(AmcScheduleAndPlanTest.day(2026, 11, 16))
                .configurationEndDate(AmcScheduleAndPlanTest.day(2027, 11, 16)).build();
        return new Input(visit, report, facility, cfg, "KhushVendor", "Assam Solar Livelihood 2026",
                "Assam", "Baksa", "Dhamdhama", "AMC Field Staff", "9876543210",
                Map.of("installationDate", AmcScheduleAndPlanTest.day(2025, 8, 14), "pinCode", "781354", "purchaseOrderNumber", "PO/2025/0412"), step);
    }

    static Step submit() {
        return new Step("SUBMIT_VISIT_REPORT", "PENDING_OTP_APPROVAL", "AMC Field Staff",
                AmcScheduleAndPlanTest.ist(2027, 5, 1, 11, 5), null);
    }

    @Test
    void headerFromVisitConfigAndLookUps() {
        Map<String, Object> d = LivelihoodReportPdfData.build(input(report(), submit()));
        assertEquals("a32dbef8-70c8-38b7-adce-8a451c7ae7c2", d.get("report_id"));
        assertEquals("Waiting for end-user code", d.get("report_status"));
        assertEquals("1 of 2", d.get("amc_number"));
        assertEquals("Nipe Brahma", d.get("end_user_name"));
        assertEquals("9678335201", d.get("end_user_phone"));
        assertEquals("Baksa", d.get("district"));
        assertEquals("KhushVendor", d.get("vendor_name"));
        assertEquals("16-05-2027", d.get("scheduled_date"));
        assertEquals("16-11-2026", d.get("amc_start_date"));
        assertEquals("16-11-2027", d.get("amc_end_date"));
        assertEquals("01-05-2027", d.get("first_submission_date"), "first submit: today");
        assertEquals("01-05-2027", d.get("latest_submission_date"));
        assertEquals("Yes", d.get("system_in_use"));
        assertEquals("No", d.get("system_functional"));
        assertEquals("Submitted by field staff", d.get("step_action"));
        assertEquals("01-05-2027 11:05 IST", d.get("step_at"));
        assertEquals("-", d.get("step_comment"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void answersBecomeReadableRowsSafeForTheTemplate() {
        List<Map<String, Object>> rows = (List<Map<String, Object>>) LivelihoodReportPdfData.build(input(report(), submit())).get("responses");
        assertEquals(7, rows.size());
        assertEquals(Map.of("label", "Service by", "value", "Ravi 'RK' Kumar"), rows.get(0));
        assertEquals("Solar battery grid", rows.get(1).get("value"));
        assertEquals("Yes", rows.get(2).get("value"));
        assertEquals("N/A", rows.get(3).get("value"));
        assertEquals(Map.of("label", "Ne voltage pcu output", "value", "3"), rows.get(4));
        assertEquals("Working", rows.get(5).get("value"));
        assertEquals("Cleaned panels (all) re-tightened (AJB)", rows.get(6).get("value"));
        for (Map<String, Object> r : rows) {
            String s = String.join("|", r.values().stream().map(String::valueOf).toList());
            assertFalse(s.contains("\"") || s.contains("[") || s.contains("{") || s.contains("\n"), s);
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void readingsDocumentsAndPhotoSlots() {
        Map<String, Object> d = LivelihoodReportPdfData.build(input(report(), submit()));
        List<Map<String, Object>> readings = (List<Map<String, Object>>) d.get("readings");
        assertEquals(Map.of("parameter", "Neutral to earth voltage at PCU output", "reading", "9 V",
                "accepted", "less than 7 V", "result", "Fail"), readings.get(0));
        assertEquals("Pass", readings.get(1).get("result"));
        List<Map<String, Object>> docs = (List<Map<String, Object>>) d.get("documents");
        assertEquals(Map.of("documentType", "Amc photo ne pcu", "count", "2"), docs.get(1));
        assertEquals(PHOTO, d.get("photo_verification_id"));
        assertEquals(PHOTO, d.get("photo_ne_pcu_id"), "first photo of the type");
        assertFalse(d.containsKey("photo_grid_spd_id"), "missing photo: key left out, pdf-service draws a blank");
    }

    @Test
    @SuppressWarnings("unchecked")
    void emptySectionsStillHaveOneRow() {
        Input in = input(VisitReport.builder().build(), submit());
        in.visit().setAdditionalDetails(null);
        Map<String, Object> d = LivelihoodReportPdfData.build(in);
        assertEquals(1, ((List<?>) d.get("responses")).size());
        assertEquals("Not evaluated yet", ((List<Map<String, Object>>) d.get("readings")).get(0).get("parameter"));
        assertEquals("No photos", ((List<Map<String, Object>>) d.get("documents")).get(0).get("documentType"));
        assertEquals("-", d.get("system_in_use"));
    }

    @Test
    void reviewerStepShowsWhoWhenAndReason() {
        Input in = input(report(), new Step("REJECT", "REJECTED", "AMC Reviewer", AmcScheduleAndPlanTest.ist(2027, 5, 3, 9, 0),
                "[{\"reason\":\"PHOTO_UNCLEAR\",\"comment\":\"Retake the SPD photo\"},{\"reason\":\"OTHERS\",\"comment\":\"Earthing \\\"loose\\\"\"}]"));
        in.visit().setFirstSubmissionDate(AmcScheduleAndPlanTest.ist(2027, 5, 1, 11, 5));
        in.visit().setLatestSubmissionDate(AmcScheduleAndPlanTest.ist(2027, 5, 2, 10, 0));
        Map<String, Object> d = LivelihoodReportPdfData.build(in);
        assertEquals("Sent for rework", d.get("report_status"));
        assertEquals("Sent for rework by reviewer", d.get("step_action"));
        assertEquals("AMC Reviewer", d.get("step_by"));
        assertEquals("Photo unclear: Retake the SPD photo; Others: Earthing 'loose'", d.get("step_comment"));
        assertEquals("01-05-2027", d.get("first_submission_date"));
        assertEquals("02-05-2027", d.get("latest_submission_date"), "not a submit: stored date");
    }

    @Test
    @SuppressWarnings("unchecked")
    void clientFormatAtSubmit() {
        VisitReport report = report();
        report.getResponses().put("visitDate", "2026-11-06");
        report.getResponses().put("obsCablesCrimped", "YES");
        report.getResponses().put("obsCableLugsUsed", "NO");
        report.setOtpVerifiedAt(1L); // left over from before the rework: not this submit's verification
        Map<String, Object> d = LivelihoodReportPdfData.build(input(report, submit()));
        assertEquals("06 Nov 2026", d.get("visit_date"));
        assertEquals("Ravi 'RK' Kumar", d.get("service_by"));
        assertEquals("9876543210", d.get("service_by_phone"), "not entered: the field staff's own mobile");
        assertEquals("14 Aug 2025", d.get("installation_date"));
        assertEquals("781354", d.get("pin_code"));
        assertEquals("PO/2025/0412", d.get("purchase_order_number"));
        assertEquals("Solar-Battery-Grid", d.get("pcu_priority"));
        assertEquals("Yes", d.get("obs_2"));
        assertEquals("ans", d.get("obs_2_style"));
        assertEquals("N/A", d.get("obs_3"));
        assertEquals("plain", d.get("obs_3_style"));
        assertEquals("Yes", d.get("obs_17"));
        assertEquals("-", d.get("obs_18"), "4.18 not answered: never another question's answer");
        assertEquals("Cleaned panels (all) re-tightened (AJB)", d.get("vendor_remarks"));
        List<Map<String, Object>> rows = (List<Map<String, Object>>) d.get("reading_rows");
        assertEquals(9, rows.size(), "no grid SPD in the report: the client's 9 rows");
        assertEquals("3 V", rows.get(0).get("value"));
        assertEquals("1", rows.get(0).get("p_ne_pcu"));
        assertEquals("1", rows.get(0).get("photo"));
        assertEquals("ans", rows.get(0).get("style"));
        assertEquals("plain", rows.get(8).get("style"));
        assertEquals("", rows.get(0).get("p_ne_grid"));
        assertEquals("", rows.get(1).get("p_ne_grid"), "photo missing: no image drawn");
        assertEquals("Working", rows.get(7).get("value"));
        assertEquals("Pending", d.get("verification_status"));
        assertEquals("-", d.get("verification_id"));
        assertEquals("01 May 2027, 11:05", d.get("submitted_at"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void clientFormatAfterVerificationAndGridSpdRows() {
        long verified = AmcScheduleAndPlanTest.ist(2027, 5, 1, 11, 42);
        VisitReport report = report();
        report.getResponses().put("gridSpdStatus", "FAILED");
        report.getResponses().put("obsCablesDamaged", "NO");
        report.setOtpVerifiedAt(verified);
        Input in = input(report, new Step("APPROVE", "APPROVED", "AMC Reviewer", AmcScheduleAndPlanTest.ist(2027, 5, 3, 9, 0), null));
        in.visit().setAdditionalDetails(Map.of("reportPdf", Map.of("visitStatus", "PENDING_OTP_APPROVAL",
                "generatedAt", AmcScheduleAndPlanTest.ist(2027, 5, 1, 11, 5))));
        Map<String, Object> d = LivelihoodReportPdfData.build(in);
        assertEquals("01 May 2027, 11:42", d.get("verified_at"));
        assertEquals("Success", d.get("verification_status"));
        assertTrue(String.valueOf(d.get("verification_id")).matches("SF-UV-20270501-[0-9A-Z]{6}"), String.valueOf(d.get("verification_id")));
        assertEquals(d.get("verification_id"), LivelihoodReportPdfData.build(in).get("verification_id"));
        assertEquals("01 May 2027, 11:05", d.get("submitted_at"));
        List<Map<String, Object>> rows = (List<Map<String, Object>>) d.get("reading_rows");
        assertEquals("No", d.get("obs_18"), "answer as given");
        assertEquals(11, rows.size());
        assertEquals("Failed", rows.get(9).get("value"));
    }

    @Test
    void autoApprovalIsTheVerification() {
        long now = AmcScheduleAndPlanTest.ist(2027, 5, 1, 11, 42);
        Map<String, Object> d = LivelihoodReportPdfData.build(input(report(), new Step("AUTO_APPROVE", "APPROVED", "System", now, null)));
        assertEquals("01 May 2027, 11:42", d.get("verified_at"));
        assertEquals(LivelihoodReportPdfData.verificationId("a32dbef8-70c8-38b7-adce-8a451c7ae7c2", now), d.get("verification_id"));
    }

    /** Writes the request the code sends, for the dev test to post to pdf-service (tests/step2_3.sh). */
    @Test
    void writesSampleRequestForTheDevTest() throws Exception {
        Map<String, Object> body = Map.of("RequestInfo", Map.of("apiId", "amc-tests"),
                "amc", LivelihoodReportPdfData.build(input(report(), submit())));
        File out = new File("target/amc-report-sample.json");
        new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT).writeValue(out, body);
        assertTrue(out.length() > 0);
    }
}
