package org.egov.amc.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import org.egov.common.contract.models.AuditDetails;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledVisit {
    private String id;
    private String tenantId;
    private String projectId;
    private String amcConfigurationId;
    private AmcConfiguration amcConfiguration;
    private String facilityId;
    private String facilityName;
    private Facility facility;
    // Localized boundary display names, resolved from facility.additionalDetails.boundary
    // before indexing - not persisted in the DB, populated only for the search index payload.
    private String state;
    private String district;
    private String block;
    // The AMC field staff mapped to this visit: the first active assignment whose HRMS user holds the
    // role configured in `amc.mapped.vendor.role.code`. Like state/district/block above, these are
    // resolved only for the search index payload and never persisted; both stay null when no assignee
    // holds that role, so the index can distinguish "unmapped" from a real name.
    private String mappedVendorName;
    private String mappedVendorUserName;
    private Integer visitNumber;
    private Long scheduledDate;
    private Long actualVisitDate;
    private Long lastVisitDate;
    private String status; // DRAFT, SCHEDULED, APPROVED, etc.
    // Soft-delete flag, distinct from `status`: status is where the visit is in its workflow,
    // isActive is whether the visit still belongs to the plan at all. Cleared when a series is
    // regenerated on a new cadence; searches hide anything with isActive = false.
    @JsonProperty("isActive")
    private Boolean isActive;
    private VisitReport visitReport;
    private Workflow workflow;
    private List<ProcessInstance> processInstances;
    private List<Transaction> transactions;
    private List<ScheduledVisitAssignment> assignments;
    private Map<String, Object> additionalDetails;
    private AuditDetails auditDetails;

    // Livelihood columns (LLD 07 §7.1). Persisted by the AMC persister; null until set.
    // The vendor org that does this visit (kept for history when the AMC moves to another org).
    private String vendorId;
    // Set once, when the first report's service code is verified; dates the next visit.
    private Long firstSubmissionDate;
    // Set on every final submission (code verified); drives the review SLA.
    private Long latestSubmissionDate;
    // SYSTEM (auto-approved) or REVIEWER; null until approved.
    private String approvedBy;

    // ---- Livelihood response additions, computed at read time (LLD §6.8, §6.9) ----
    /** PENDING_APPROVAL only: 00:00 IST of (latest submission day + reviewSlaDays). */
    private Long slaDueDate;
    private Boolean slaBreached;
    private Integer slaDaysRemaining;
    private String vendorName;
    /** The active assignee: {uuid, name, mobile}. */
    private Map<String, Object> fieldStaff;
    private Integer totalVisits;
    /** First day a first report may be submitted: due day - submissionWindowDays (00:00 IST). */
    private Long submissionWindowOpensAt;
    private String activityFacilityId;
    /** With includeSiteDetails=true (G1): {activityFacilityId, solarAssetId, systemType, batteryType, components, machines,
     *  installationDate, pinCode, purchaseOrderNumber}. */
    private Map<String, Object> siteDetails;
}
