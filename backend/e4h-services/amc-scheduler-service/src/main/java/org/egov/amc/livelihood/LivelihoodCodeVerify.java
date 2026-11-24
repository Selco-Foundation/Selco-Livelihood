package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.web.models.ProcessInstance;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.tracer.model.CustomException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Field staff enter the end user's code ({@code SUBMIT_OTP}, LLD §6.3 / §6.8), in this order:
 * <ol>
 *   <li>checks: caller is the visit's active field staff; visit is PENDING_OTP_APPROVAL; a code was sent; phone</li>
 *   <li>(a) auto-approval rules on the saved report (no side effects; skipped when switched off)</li>
 *   <li>(b) the PDF with the verification on it, "Approved" or "Pending approval" (strict; a failure leaves the code
 *       unused for a retry)</li>
 *   <li>(c) validate the code (egov-otp must say validationSuccessful; with the OTP bypass only the default code)</li>
 *   <li>(d) workflow AUTO_APPROVE as the system user (-> APPROVED) or SUBMIT_OTP (-> PENDING_APPROVAL)</li>
 *   <li>(e) save: First Submission Date once, Latest always, otpVerifiedAt, autoApproval, approved_by = SYSTEM,
 *       reportPdf; one visit_transaction carrying autoApproval</li>
 *   <li>first verification only: the next visit; auto-approved: the completion check (failures are logged)</li>
 * </ol>
 */
@Slf4j
public final class LivelihoodCodeVerify {

    private LivelihoodCodeVerify() {
    }

    public static final String SUBMIT_OTP = "SUBMIT_OTP";
    public static final String AUTO_APPROVE = "AUTO_APPROVE";
    public static final String APPROVED_BY_SYSTEM = "SYSTEM";
    public static final String AMC_INVALID_SERVICE_CODE = "AMC_INVALID_SERVICE_CODE";

    public interface Steps {
        /** The rule result ({passed, rules, ...}), or null when auto-approval is switched off. */
        Map<String, Object> evaluateRules(ScheduledVisit visit, long now);

        /** The fileStoreId of the PDF for AUTO_APPROVE or SUBMIT_OTP, or null when the PDF is switched off. */
        String makePdf(String action, ScheduledVisit visit, long now);

        /** true only when the code is right; never throws for a wrong code. */
        boolean codeIsValid(String phone, String code);

        /** AUTO_APPROVE runs as the system user, SUBMIT_OTP as the field staff. */
        ProcessInstance transition(String action, String pdfFileStoreId);

        void save(ScheduledVisit visit, ProcessInstance processInstance, Map<String, Object> autoApproval);

        /** Creates visit n+1 after visit n's first verification; may return quietly when none is due. */
        void createNextVisit(ScheduledVisit visit, long firstSubmissionDate);

        void completeIfAllApproved(ScheduledVisit visit);
    }

    /** egov-otp confirmed the code: a response alone is not enough (E4H accepted any non-null response). */
    public static boolean confirmed(org.egov.amc.web.models.OtpResponse response) {
        return response != null && response.getOtp() != null && response.getOtp().isValidationSuccessful();
    }

    public static ScheduledVisit run(ScheduledVisit visit, String callerUuid, String code, long now, Steps steps) {
        LivelihoodVisitSubmit.activeAssignee(visit, callerUuid);
        if (!LivelihoodVisitSubmit.STATUS_PENDING_OTP_APPROVAL.equals(visit.getStatus())) {
            throw new CustomException(LivelihoodVisitSubmit.AMC_VISIT_NOT_SUBMITTABLE,
                    "No service code is pending for a visit in status " + visit.getStatus());
        }
        if (visit.getVisitReport() == null) {
            throw new CustomException(LivelihoodVisitSubmit.AMC_VISIT_NOT_SUBMITTABLE, "The visit has no saved report");
        }
        if (code == null || code.isBlank()) {
            throw new CustomException(AMC_INVALID_SERVICE_CODE, "Enter the service code the end user received");
        }
        String phone = LivelihoodVisitSubmit.endUserPhone(visit.getFacility());

        Map<String, Object> auto = steps.evaluateRules(visit, now);                          // (a)
        boolean approve = auto != null && Boolean.TRUE.equals(auto.get("passed"));
        if (auto != null) {
            // in memory only until (e): the PDF shows the readings
            Map<String, Object> details = visit.getAdditionalDetails() == null ? new LinkedHashMap<>() : new LinkedHashMap<>(visit.getAdditionalDetails());
            details.put("autoApproval", auto);
            visit.setAdditionalDetails(details);
        }
        String action = approve ? AUTO_APPROVE : SUBMIT_OTP;
        String pdf = steps.makePdf(action, visit, now);                                      // (b)
        if (!steps.codeIsValid(phone, code.trim())) {                                        // (c)
            throw new CustomException(AMC_INVALID_SERVICE_CODE, "The service code is not correct");
        }
        ProcessInstance pi = steps.transition(action, pdf);                                  // (d)

        boolean firstVerification = !LivelihoodAmc.isSet(visit.getFirstSubmissionDate());    // (e)
        if (firstVerification) {
            visit.setFirstSubmissionDate(now);
        }
        visit.setLatestSubmissionDate(now);
        visit.getVisitReport().setOtpVerifiedAt(now);
        visit.getVisitReport().setOtpReference(null);
        visit.setStatus(pi != null && pi.getState() != null ? pi.getState().getState() : (approve ? "APPROVED" : "PENDING_APPROVAL"));
        if (approve) {
            visit.setApprovedBy(APPROVED_BY_SYSTEM);
        }
        visit.setAdditionalDetails(LivelihoodVisitSubmit.withSubmitDetails(visit.getAdditionalDetails(), null, pdf, visit.getStatus(), now));
        steps.save(visit, pi, auto);

        if (firstVerification) {
            try {
                steps.createNextVisit(visit, now);
            } catch (RuntimeException e) {
                log.error("Next visit after visit {} ({}) not created; run _create-missing-visits", visit.getVisitNumber(), visit.getId(), e);
            }
        }
        if (approve) {
            try {
                steps.completeIfAllApproved(visit);
            } catch (RuntimeException e) {
                log.error("Completion check failed after auto-approving visit {}", visit.getId(), e);
            }
        }
        return visit;
    }
}
