package org.egov.amc.livelihood;

import org.egov.amc.livelihood.LivelihoodAmcCreateValidator.RowError;
import org.egov.amc.livelihood.VendorOrgDirectory.OrgMember;
import org.egov.amc.livelihood.VendorOrgDirectory.VendorOrg;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AmcConfigurationAssignment;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitAssignment;
import org.egov.common.contract.models.AuditDetails;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import static org.egov.amc.livelihood.LivelihoodAmc.*;

/**
 * Changing the AMC's one named field staff, optionally with its vendor org (LLD §6.6), as plain data.
 * Only this change writes assignments and vendor_id (review A5). Open visits only: the upcoming visit (not yet
 * finally submitted) and REJECTED visits; visits in review or approved never change.
 *
 * <pre>
 * upcoming visit         same org                         org changed
 * SCHEDULED              move to the new person           move, and set vendor_id
 * PENDING_OTP_APPROVAL   move (report kept)               RESET_FOR_REASSIGNMENT -> SCHEDULED, report and
 *                                                         per-visit data cleared, move, vendor_id
 * REJECTED               move to the new person           stays with the original org and person
 * none (pending AMC)     config only                      config only
 * </pre>
 * {@code rejectedVisitFieldStaffUserId}: moves a REJECTED visit left with an earlier org to a named person of that org.
 */
public final class FieldStaffChangePlanner {

    private FieldStaffChangePlanner() {
    }

    public static final String DUPLICATE_ACTIVITY_FACILITY = "DUPLICATE_ACTIVITY_FACILITY";
    public static final String AMC_NO_REJECTED_VISIT_TO_MOVE = "AMC_NO_REJECTED_VISIT_TO_MOVE";
    public static final String RESET_FOR_REASSIGNMENT = "RESET_FOR_REASSIGNMENT";
    static final Set<String> CLEARED_ON_RESET = Set.of("systemStatus", "reportPdf", "autoApproval");

    public record Update(String tenantId, String activityFacilityId, String vendorOrgId, String fieldStaffUserId,
                         String rejectedVisitFieldStaffUserId) {
    }

    /** What one row does: null configuration = unchanged. resets = visits that need RESET_FOR_REASSIGNMENT first. */
    public record RowPlan(AmcConfiguration configuration, List<ScheduledVisit> visitUpdates, List<ScheduledVisit> resets) {
        public boolean unchanged() {
            return configuration == null;
        }
    }

    // ---- checks -----------------------------------------------------------------------------------------

    /**
     * @param running   the running AMC of the row (PENDING_ACTIVATION or ACTIVE), or null
     * @param completed true when the row only has COMPLETED AMCs
     * @param visits    the running AMC's live visits (with vendorId and assignments)
     */
    public static List<RowError> check(int index, Update u, AmcConfiguration running, boolean completed, List<ScheduledVisit> visits,
                                       Map<String, VendorOrg> orgs, Map<String, OrgMember> members, Set<String> seenRows) {
        List<RowError> errors = new ArrayList<>();
        String row = u.activityFacilityId();
        if (row == null || row.isBlank()) {
            errors.add(new RowError(index, null, "activityFacilityId", AMC_INVALID_ACTIVITY_FACILITY, "activityFacilityId is required"));
            return errors;
        }
        if (!seenRows.add(row)) {
            errors.add(new RowError(index, row, "activityFacilityId", DUPLICATE_ACTIVITY_FACILITY, "the same row is twice in the request"));
            return errors;
        }
        if (running == null) {
            errors.add(completed
                    ? new RowError(index, row, "activityFacilityId", LivelihoodAmcEditPlanner.AMC_COMPLETED, "the AMC of this row is completed")
                    : new RowError(index, row, "activityFacilityId", LivelihoodAmcEditPlanner.AMC_NOT_FOUND, "no running AMC on this row"));
            return errors;
        }
        String targetOrg = blankToNull(u.vendorOrgId()) != null ? u.vendorOrgId() : running.getVendorId();
        if (blankToNull(u.vendorOrgId()) != null) {
            VendorOrg org = orgs.get(u.vendorOrgId());
            if (org == null || !org.isActiveVendor()) {
                errors.add(new RowError(index, row, "vendorOrgId", AMC_INVALID_VENDOR_ORG, "not an active vendor org"));
                return errors;
            }
        }
        memberCheck(errors, index, row, "fieldStaffUserId", targetOrg, u.fieldStaffUserId(), members);

        if (blankToNull(u.rejectedVisitFieldStaffUserId()) != null) {
            List<ScheduledVisit> left = rejectedLeftWithOtherOrg(visits, targetOrg);
            if (left.isEmpty()) {
                errors.add(new RowError(index, row, "rejectedVisitFieldStaffUserId", AMC_NO_REJECTED_VISIT_TO_MOVE,
                        "no rework visit was left with an earlier vendor org"));
            } else {
                memberCheck(errors, index, row, "rejectedVisitFieldStaffUserId", left.get(0).getVendorId(),
                        u.rejectedVisitFieldStaffUserId(), members);
            }
        }
        return errors;
    }

    private static void memberCheck(List<RowError> errors, int index, String row, String field, String orgId, String userId,
                                    Map<String, OrgMember> members) {
        if (blankToNull(userId) == null) {
            errors.add(new RowError(index, row, field, AMC_FIELD_STAFF_NOT_IN_ORG, field + " is required"));
            return;
        }
        OrgMember m = members.get(VendorOrgDirectory.memberKey(orgId, userId));
        if (m == null || m.deleted()) {
            errors.add(new RowError(index, row, field, AMC_FIELD_STAFF_NOT_IN_ORG, "the user is not a member of vendor org " + orgId));
        } else if (!m.hasRole(ROLE_AMC_FIELD_STAFF)) {
            errors.add(new RowError(index, row, field, AMC_FIELD_STAFF_ROLE_MISSING, "the user does not have " + ROLE_AMC_FIELD_STAFF));
        }
    }

    // ---- plan -------------------------------------------------------------------------------------------

    /** For a row that passed {@link #check}. Mutates the given objects; returns what to write. */
    public static RowPlan plan(Update u, AmcConfiguration cfg, List<ScheduledVisit> visits, AuditDetails audit) {
        String oldOrg = cfg.getVendorId();
        String newOrg = blankToNull(u.vendorOrgId()) != null ? u.vendorOrgId() : oldOrg;
        boolean orgChanged = !Objects.equals(oldOrg, newOrg);
        String newUser = u.fieldStaffUserId();
        boolean staffChanged = !Objects.equals(LivelihoodAmcEditPlanner.activeFieldStaff(cfg), newUser);

        List<ScheduledVisit> updates = new ArrayList<>();
        List<ScheduledVisit> resets = new ArrayList<>();
        if (orgChanged || staffChanged) {
            for (ScheduledVisit v : visits) {
                boolean upcoming = !isSet(v.getFirstSubmissionDate())
                        && ("SCHEDULED".equals(v.getStatus()) || "PENDING_OTP_APPROVAL".equals(v.getStatus()));
                boolean rework = "REJECTED".equals(v.getStatus()) && Objects.equals(v.getVendorId(), oldOrg);
                if (upcoming) {
                    if (orgChanged && "PENDING_OTP_APPROVAL".equals(v.getStatus())) {
                        resets.add(v);
                        clearForReset(v);
                    }
                    if (orgChanged) {
                        v.setVendorId(newOrg);
                    }
                    v.setAssignments(reassignVisit(v, newUser, audit));
                    updates.add(v);
                } else if (rework && !orgChanged) {
                    v.setAssignments(reassignVisit(v, newUser, audit));
                    updates.add(v);
                }
            }
        }
        boolean reworkMoved = false;
        String reworkUser = blankToNull(u.rejectedVisitFieldStaffUserId());
        if (reworkUser != null) {
            for (ScheduledVisit v : rejectedLeftWithOtherOrg(visits, newOrg)) {
                if (!reworkUser.equals(activeVisitAssignee(v))) {
                    v.setAssignments(reassignVisit(v, reworkUser, audit));
                    if (!updates.contains(v)) {
                        updates.add(v);
                    }
                    reworkMoved = true;
                }
            }
        }
        if (!orgChanged && !staffChanged && !reworkMoved) {
            return new RowPlan(null, List.of(), List.of());
        }
        if (orgChanged) {
            cfg.setVendorId(newOrg);
        }
        if (staffChanged) {
            cfg.setAssignments(reassignConfig(cfg, newUser, audit));
        }
        return new RowPlan(cfg, updates, resets);
    }

    /** REJECTED visits whose org is not the AMC's (left behind by an org change). */
    static List<ScheduledVisit> rejectedLeftWithOtherOrg(List<ScheduledVisit> visits, String amcOrg) {
        return visits.stream().filter(v -> "REJECTED".equals(v.getStatus()) && v.getVendorId() != null
                && !v.getVendorId().equals(amcOrg)).toList();
    }

    /** Old active row off, the new person's row on: an earlier row of the same person is reactivated (A -> B -> A). */
    static List<AmcConfigurationAssignment> reassignConfig(AmcConfiguration cfg, String newUser, AuditDetails audit) {
        List<AmcConfigurationAssignment> out = new ArrayList<>();
        boolean found = false;
        for (AmcConfigurationAssignment a : cfg.getAssignments() == null ? List.<AmcConfigurationAssignment>of() : cfg.getAssignments()) {
            if (newUser.equals(a.getAssignedUser())) {
                found = true;
                if (!a.isActive()) {
                    a.setActive(true);
                    a.setAuditDetails(touched(a.getAuditDetails(), audit));
                }
            } else if (a.isActive()) {
                a.setActive(false);
                a.setAuditDetails(touched(a.getAuditDetails(), audit));
            }
            out.add(a);
        }
        if (!found) {
            out.add(AmcConfigurationAssignment.builder().id(configAssignmentId(cfg.getId(), newUser)).tenantId(cfg.getTenantId())
                    .amcConfigurationId(cfg.getId()).assignedUser(newUser).isActive(true).auditDetails(audit).build());
        }
        return out;
    }

    static List<ScheduledVisitAssignment> reassignVisit(ScheduledVisit v, String newUser, AuditDetails audit) {
        List<ScheduledVisitAssignment> out = new ArrayList<>();
        boolean found = false;
        for (ScheduledVisitAssignment a : v.getAssignments() == null ? List.<ScheduledVisitAssignment>of() : v.getAssignments()) {
            if (newUser.equals(a.getAssignedUser())) {
                found = true;
                a.setActive(true);
            } else {
                a.setActive(false);
            }
            a.setAuditDetails(touched(a.getAuditDetails(), audit));
            out.add(a);
        }
        if (!found) {
            out.add(ScheduledVisitAssignment.builder().id(AmcSchedule.visitAssignmentId(v.getId(), newUser)).tenantId(v.getTenantId())
                    .scheduledVisitId(v.getId()).assignedUser(newUser).isActive(true).auditDetails(audit).build());
        }
        return out;
    }

    static void clearForReset(ScheduledVisit v) {
        v.setVisitReport(null);
        v.setStatus("SCHEDULED");
        v.setActualVisitDate(null);
        if (v.getAdditionalDetails() != null) {
            Map<String, Object> d = new LinkedHashMap<>(v.getAdditionalDetails());
            CLEARED_ON_RESET.forEach(d::remove);
            v.setAdditionalDetails(d);
        }
    }

    static String activeVisitAssignee(ScheduledVisit v) {
        if (v.getAssignments() != null) {
            for (ScheduledVisitAssignment a : v.getAssignments()) {
                if (a.isActive()) {
                    return a.getAssignedUser();
                }
            }
        }
        return null;
    }

    static String configAssignmentId(String configId, String user) {
        return UUID.nameUUIDFromBytes(("amc-config-assignment|" + configId + "|" + user).getBytes(StandardCharsets.UTF_8)).toString();
    }

    private static AuditDetails touched(AuditDetails old, AuditDetails now) {
        return AuditDetails.builder()
                .createdBy(old != null && old.getCreatedBy() != null ? old.getCreatedBy() : now.getCreatedBy())
                .createdTime(old != null && old.getCreatedTime() != null ? old.getCreatedTime() : now.getCreatedTime())
                .lastModifiedBy(now.getLastModifiedBy())
                .lastModifiedTime(now.getLastModifiedTime())
                .build();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
