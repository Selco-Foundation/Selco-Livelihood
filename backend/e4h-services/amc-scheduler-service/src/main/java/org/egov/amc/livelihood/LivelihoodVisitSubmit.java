package org.egov.amc.livelihood;

import org.egov.amc.web.models.Facility;
import org.egov.amc.web.models.ProcessInstance;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitAssignment;
import org.egov.amc.web.models.VisitReport;
import org.egov.tracer.model.CustomException;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Field staff report submit for Livelihood ({@code SUBMIT_VISIT_REPORT}, LLD §6.4), in the agreed order:
 * <ol>
 *   <li>caller is the visit's active field staff</li>
 *   <li>status SCHEDULED (first submit) or REJECTED (rework)</li>
 *   <li>window, first submit only: today &ge; due date &minus; submissionWindowDays (IST days)</li>
 *   <li>verification photo present</li>
 *   <li>end user's phone present</li>
 *   <li>PDF (strict)</li>
 *   <li>create the service code (stored, not sent)</li>
 *   <li>workflow SUBMIT_VISIT_REPORT</li>
 *   <li>save the visit (report without the code, systemStatus, reportPdf) + one visit_transaction</li>
 *   <li>send the code SMS last (a failure is logged; the field staff can use Resend code)</li>
 * </ol>
 * A failing step stops everything after it, so a failed submit never sends a code.
 */
@Slf4j
public final class LivelihoodVisitSubmit {

    private LivelihoodVisitSubmit() {
    }

    public static final String SUBMIT_VISIT_REPORT = "SUBMIT_VISIT_REPORT";
    public static final String STATUS_SCHEDULED = "SCHEDULED";
    public static final String STATUS_REJECTED = "REJECTED";
    public static final String STATUS_PENDING_OTP_APPROVAL = "PENDING_OTP_APPROVAL";
    public static final String VERIFICATION_PHOTO = "AMC_VERIFICATION_PHOTO";

    /** Actions only the service itself takes (as the system user); refused from clients. */
    public static final Set<String> SYSTEM_ONLY_ACTIONS = Set.of("AUTO_APPROVE", "SCHEDULE", "RESET_FOR_REASSIGNMENT");

    public static final String AMC_VISIT_NOT_ASSIGNED_TO_USER = "AMC_VISIT_NOT_ASSIGNED_TO_USER";
    public static final String AMC_VISIT_NOT_SUBMITTABLE = "AMC_VISIT_NOT_SUBMITTABLE";
    public static final String AMC_SUBMISSION_WINDOW_NOT_OPEN = "AMC_SUBMISSION_WINDOW_NOT_OPEN";
    public static final String AMC_VERIFICATION_PHOTO_MISSING = "AMC_VERIFICATION_PHOTO_MISSING";
    public static final String AMC_END_USER_PHONE_MISSING = "AMC_END_USER_PHONE_MISSING";
    public static final String AMC_SERVICE_CODE_FAILED = "AMC_SERVICE_CODE_FAILED";
    public static final String AMC_ACTION_NOT_ALLOWED = "AMC_ACTION_NOT_ALLOWED";

    /** What the submit needs from the rest of the service; implemented by ScheduledVisitService. */
    public interface Steps {
        int submissionWindowDays();

        /** Returns the PDF fileStoreId, or null when the PDF is switched off. */
        String makePdf(String fieldStaffName, long now);

        /** Creates the code in egov-otp and returns it; never sends it. */
        String createCode(String phone);

        ProcessInstance transition(String pdfFileStoreId);

        void save(ScheduledVisit visit, ProcessInstance processInstance);

        void sendCode(String phone, String code);
    }

    /** Runs the submit; {@code visit} must already carry the new report (without any code). */
    public static ScheduledVisit run(ScheduledVisit visit, String callerUuid, long now, Steps steps) {
        ScheduledVisitAssignment assignee = activeAssignee(visit, callerUuid);       // 1
        boolean firstSubmit = checkSubmittable(visit.getStatus());                     // 2
        if (firstSubmit) {
            checkWindow(visit.getScheduledDate(), now, steps.submissionWindowDays());  // 3
        }
        checkVerificationPhoto(visit.getVisitReport());                                // 4
        String phone = endUserPhone(visit.getFacility());                              // 5

        visit.setActualVisitDate(now);
        String pdf = steps.makePdf(fieldStaffName(assignee), now);                     // 6
        String code = steps.createCode(phone);                                         // 7
        if (code == null || code.isBlank()) {
            throw new CustomException(AMC_SERVICE_CODE_FAILED, "Could not create the service code. Please try again.");
        }
        ProcessInstance pi = steps.transition(pdf);                                    // 8

        visit.setStatus(pi != null && pi.getState() != null ? pi.getState().getState() : STATUS_PENDING_OTP_APPROVAL);
        visit.setAdditionalDetails(withSubmitDetails(visit.getAdditionalDetails(), visit.getVisitReport(), pdf, visit.getStatus(), now));
        steps.save(visit, pi);                                                         // 9

        try {
            steps.sendCode(phone, code);                                               // 10
        } catch (RuntimeException e) {
            log.error("Service code SMS failed for visit {} (report saved; field staff can resend)", visit.getId(), e);
        }
        return visit;
    }

    /** Resend code: the active field staff, while the visit waits for the code; returns the end user's phone. */
    public static String checkResend(ScheduledVisit visit, String callerUuid) {
        activeAssignee(visit, callerUuid);
        if (!STATUS_PENDING_OTP_APPROVAL.equals(visit.getStatus())) {
            throw new CustomException(AMC_VISIT_NOT_SUBMITTABLE, "No service code is pending for a visit in status " + visit.getStatus());
        }
        return endUserPhone(visit.getFacility());
    }

    // ---- checks -----------------------------------------------------------------------------------

    public static void rejectSystemOnlyAction(String action) {
        if (action != null && SYSTEM_ONLY_ACTIONS.contains(action.toUpperCase())) {
            throw new CustomException(AMC_ACTION_NOT_ALLOWED, "Action " + action + " is taken by the system only");
        }
    }

    static ScheduledVisitAssignment activeAssignee(ScheduledVisit visit, String callerUuid) {
        if (visit.getAssignments() != null && callerUuid != null) {
            for (ScheduledVisitAssignment a : visit.getAssignments()) {
                if (a != null && a.isActive() && callerUuid.equals(a.getAssignedUser())) {
                    return a;
                }
            }
        }
        throw new CustomException(AMC_VISIT_NOT_ASSIGNED_TO_USER, "This visit is not assigned to you");
    }

    /** true = first submit (SCHEDULED), false = rework resubmit (REJECTED). */
    static boolean checkSubmittable(String status) {
        if (STATUS_SCHEDULED.equals(status)) {
            return true;
        }
        if (STATUS_REJECTED.equals(status)) {
            return false;
        }
        throw new CustomException(AMC_VISIT_NOT_SUBMITTABLE, "A report can't be submitted for a visit in status " + status);
    }

    /** Open from (due day - windowDays) in IST, inclusive. A visit past its due date stays open. */
    static void checkWindow(Long dueDate, long now, int windowDays) {
        if (!LivelihoodAmc.isSet(dueDate)) {
            return;
        }
        LocalDate opens = LivelihoodAmc.istDay(dueDate).minusDays(windowDays);
        if (LivelihoodAmc.istDay(now).isBefore(opens)) {
            throw new CustomException(AMC_SUBMISSION_WINDOW_NOT_OPEN,
                    "The report can be submitted from " + opens + " (" + windowDays + " days before the due date)");
        }
    }

    static void checkVerificationPhoto(VisitReport report) {
        boolean present = report != null && report.getDocuments() != null && report.getDocuments().stream()
                .anyMatch(d -> d != null && VERIFICATION_PHOTO.equalsIgnoreCase(d.getDocumentType())
                        && d.getFileStoreId() != null && !d.getFileStoreId().isBlank());
        if (!present) {
            throw new CustomException(AMC_VERIFICATION_PHOTO_MISSING,
                    "Add the photo of the system with the end user and the technician (" + VERIFICATION_PHOTO + ")");
        }
    }

    /** The decrypted phone from visit search; a value still in "<key>|<cipher>" form counts as missing. */
    static String endUserPhone(Facility facility) {
        String phone = facility == null ? null : facility.getFacilityPocPhone();
        if (phone == null || phone.isBlank() || phone.contains("|")) {
            throw new CustomException(AMC_END_USER_PHONE_MISSING, "The end user has no phone number to send the service code to");
        }
        return phone.trim();
    }

    static String fieldStaffName(ScheduledVisitAssignment a) {
        return a.getUser() != null && a.getUser().getName() != null ? a.getUser().getName() : null;
    }

    /** When the report was submitted, kept through the later PDFs; null when unknown (no submit-step PDF). */
    static Long submittedAt(Map<String, Object> additionalDetails) {
        if (additionalDetails == null || !(additionalDetails.get("reportPdf") instanceof Map<?, ?> pdf)) {
            return null;
        }
        if (pdf.get("submittedAt") instanceof Number n) {
            return n.longValue();
        }
        // PDFs stored before submittedAt was kept
        return STATUS_PENDING_OTP_APPROVAL.equals(pdf.get("visitStatus")) && pdf.get("generatedAt") instanceof Number n ? n.longValue() : null;
    }

    /** systemStatus from the report (the app sends it there) and the latest PDF (LLD §6.10). */
    static Map<String, Object> withSubmitDetails(Map<String, Object> current, VisitReport report, String pdf, String status, long now) {
        Map<String, Object> out = current == null ? new LinkedHashMap<>() : new LinkedHashMap<>(current);
        Object systemStatus = report != null && report.getAdditionalDetails() != null ? report.getAdditionalDetails().get("systemStatus") : null;
        if (systemStatus instanceof Map<?, ?>) {
            out.put("systemStatus", systemStatus);
        }
        if (pdf != null) {
            Map<String, Object> reportPdf = new LinkedHashMap<>();
            reportPdf.put("fileStoreId", pdf);
            reportPdf.put("visitStatus", status);
            reportPdf.put("generatedAt", now);
            Long submittedAt = STATUS_PENDING_OTP_APPROVAL.equals(status) ? Long.valueOf(now) : submittedAt(out);
            if (submittedAt != null) {
                reportPdf.put("submittedAt", submittedAt);
            }
            out.put("reportPdf", reportPdf);
        }
        return out;
    }
}
