package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.egov.amc.web.models.ProcessInstance;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitAssignment;
import org.egov.common.contract.request.Role;
import org.egov.common.contract.request.User;
import org.egov.tracer.model.CustomException;

import java.util.Set;

/**
 * Reviewer actions on a report waiting for review (LLD §6.8), in this order:
 * <ol>
 *   <li>caller has AMC_REVIEWER; visit is PENDING_APPROVAL (APPROVED is final)</li>
 *   <li>Send for Rework only: reasons = JSON list [{reason, comment}], at least one; each reason an active
 *       MDMS AMC.RejectionReasons code or OTHERS; comment required for OTHERS</li>
 *   <li>PDF for this step (strict)</li>
 *   <li>workflow APPROVE / REJECT</li>
 *   <li>save: status, reportPdf, approved_by = REVIEWER on approve; one visit_transaction</li>
 *   <li>approve only: complete the AMC if every visit is now approved (a failure is logged)</li>
 * </ol>
 * Reviewers see every report and need no assignment.
 */
@Slf4j
public final class LivelihoodReview {

    private LivelihoodReview() {
    }

    public static final String APPROVE = "APPROVE";
    public static final String REJECT = "REJECT";
    public static final String ROLE_AMC_REVIEWER = "AMC_REVIEWER";
    public static final String STATUS_PENDING_APPROVAL = "PENDING_APPROVAL";
    public static final String STATUS_APPROVED = "APPROVED";
    public static final String STATUS_REJECTED = "REJECTED";
    public static final String APPROVED_BY_REVIEWER = "REVIEWER";
    public static final String OTHERS = "OTHERS";

    public static final String AMC_INVALID_REJECTION_REASON = "AMC_INVALID_REJECTION_REASON";
    public static final String AMC_VISIT_NOT_REVIEWABLE = "AMC_VISIT_NOT_REVIEWABLE";

    private static final ObjectMapper JSON = new ObjectMapper();

    public static boolean isReviewAction(String action) {
        return APPROVE.equalsIgnoreCase(action) || REJECT.equalsIgnoreCase(action);
    }

    public interface Steps {
        Set<String> activeReasonCodes();

        /** Returns the PDF fileStoreId, or null when the PDF is switched off. */
        String makePdf(String action, String statusAfter, String reviewerName, String fieldStaffName, String comment, long now);

        ProcessInstance transition(String action, String pdfFileStoreId);

        void save(ScheduledVisit visit, ProcessInstance processInstance);

        void completeIfAllApproved(ScheduledVisit visit);
    }

    public static ScheduledVisit run(ScheduledVisit visit, String action, User caller, String tenantId, String comment, long now, Steps steps) {
        String act = action.toUpperCase();
        checkReviewer(caller, tenantId);
        if (!STATUS_PENDING_APPROVAL.equals(visit.getStatus())) {
            throw new CustomException(AMC_VISIT_NOT_REVIEWABLE, "Only a report waiting for review can be actioned; this one is " + visit.getStatus());
        }
        if (REJECT.equals(act)) {
            validateReasons(comment, steps.activeReasonCodes());
        }
        String statusAfter = APPROVE.equals(act) ? STATUS_APPROVED : STATUS_REJECTED;
        String pdf = steps.makePdf(act, statusAfter, caller.getName(), fieldStaffName(visit), comment, now);
        ProcessInstance pi = steps.transition(act, pdf);

        visit.setStatus(pi != null && pi.getState() != null ? pi.getState().getState() : statusAfter);
        if (APPROVE.equals(act)) {
            visit.setApprovedBy(APPROVED_BY_REVIEWER);
        }
        visit.setAdditionalDetails(LivelihoodVisitSubmit.withSubmitDetails(visit.getAdditionalDetails(), null, pdf, visit.getStatus(), now));
        steps.save(visit, pi);

        if (APPROVE.equals(act)) {
            try {
                steps.completeIfAllApproved(visit);
            } catch (RuntimeException e) {
                log.error("Completion check failed after approving visit {} of AMC {}", visit.getId(), visit.getAmcConfigurationId(), e);
            }
        }
        return visit;
    }

    static void checkReviewer(User caller, String tenantId) {
        boolean reviewer = caller != null && caller.getRoles() != null && caller.getRoles().stream()
                .anyMatch(r -> isReviewerRole(r, tenantId));
        if (!reviewer) {
            throw new CustomException(LivelihoodVisitSubmit.AMC_ACTION_NOT_ALLOWED, "Only an AMC reviewer can approve or send a report for rework");
        }
    }

    private static boolean isReviewerRole(Role r, String tenantId) {
        return r != null && ROLE_AMC_REVIEWER.equals(r.getCode())
                && (r.getTenantId() == null || tenantId == null || tenantId.equals(r.getTenantId()));
    }

    /** D8: [{"reason":"<code or OTHERS>","comment":"<text>"}], at least one entry; comment required for OTHERS. */
    static void validateReasons(String comment, Set<String> activeCodes) {
        JsonNode list;
        try {
            list = comment == null ? null : JSON.readTree(comment);
        } catch (Exception e) {
            list = null;
        }
        if (list == null || !list.isArray() || list.isEmpty()) {
            throw invalid("Choose at least one reason for rework");
        }
        for (JsonNode e : list) {
            String reason = e.path("reason").asText("").trim();
            String text = e.path("comment").asText("").trim();
            if (reason.isEmpty() || !(OTHERS.equals(reason) || (activeCodes != null && activeCodes.contains(reason)))) {
                throw invalid("Unknown rework reason: " + reason);
            }
            if (OTHERS.equals(reason) && text.isEmpty()) {
                throw invalid("Add a comment when the reason is Others");
            }
        }
    }

    /** Every visit 1..total approved, counting this one (its own status write is still on its way, review A2). */
    public static boolean allApproved(int approvedOtherVisits, int totalVisits) {
        return totalVisits > 0 && approvedOtherVisits + 1 >= totalVisits;
    }

    static String fieldStaffName(ScheduledVisit visit) {
        if (visit.getAssignments() != null) {
            for (ScheduledVisitAssignment a : visit.getAssignments()) {
                if (a != null && a.isActive() && a.getUser() != null) {
                    return a.getUser().getName();
                }
            }
        }
        return null;
    }

    private static CustomException invalid(String message) {
        return new CustomException(AMC_INVALID_REJECTION_REASON, message);
    }
}
