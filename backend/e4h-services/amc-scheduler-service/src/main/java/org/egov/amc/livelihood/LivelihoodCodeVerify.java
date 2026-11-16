package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.web.models.ProcessInstance;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.tracer.model.CustomException;

/**
 * Field staff enter the end user's code ({@code SUBMIT_OTP}, LLD §6.3 / §6.8), in this order:
 * <ol>
 *   <li>caller is the visit's active field staff; visit is PENDING_OTP_APPROVAL; a code was sent in the request</li>
 *   <li>validate the code (egov-otp must say validationSuccessful; with the OTP bypass only the default code passes)</li>
 *   <li>workflow SUBMIT_OTP (-> PENDING_APPROVAL; auto-approval comes in step 3.2)</li>
 *   <li>save: First Submission Date once, Latest Submission Date always, otpVerifiedAt; one visit_transaction</li>
 *   <li>first verification only: create the next visit (a failure is logged; {@code _create-missing-visits} repairs it)</li>
 * </ol>
 */
@Slf4j
public final class LivelihoodCodeVerify {

    private LivelihoodCodeVerify() {
    }

    public static final String SUBMIT_OTP = "SUBMIT_OTP";
    public static final String AMC_INVALID_SERVICE_CODE = "AMC_INVALID_SERVICE_CODE";

    public interface Steps {
        /** true only when the code is right; never throws for a wrong code. */
        boolean codeIsValid(String phone, String code);

        ProcessInstance transition();

        void save(ScheduledVisit visit, ProcessInstance processInstance);

        /** Creates visit n+1 after visit n's first verification; may return quietly when none is due. */
        void createNextVisit(ScheduledVisit visit, long firstSubmissionDate);
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
        if (!steps.codeIsValid(phone, code.trim())) {
            throw new CustomException(AMC_INVALID_SERVICE_CODE, "The service code is not correct");
        }

        ProcessInstance pi = steps.transition();

        boolean firstVerification = !LivelihoodAmc.isSet(visit.getFirstSubmissionDate());
        if (firstVerification) {
            visit.setFirstSubmissionDate(now);
        }
        visit.setLatestSubmissionDate(now);
        visit.getVisitReport().setOtpVerifiedAt(now);
        visit.getVisitReport().setOtpReference(null);
        visit.setStatus(pi != null && pi.getState() != null ? pi.getState().getState() : "PENDING_APPROVAL");
        steps.save(visit, pi);

        if (firstVerification) {
            try {
                steps.createNextVisit(visit, now);
            } catch (RuntimeException e) {
                log.error("Next visit after visit {} ({}) not created; run _create-missing-visits", visit.getVisitNumber(), visit.getId(), e);
            }
        }
        return visit;
    }
}
