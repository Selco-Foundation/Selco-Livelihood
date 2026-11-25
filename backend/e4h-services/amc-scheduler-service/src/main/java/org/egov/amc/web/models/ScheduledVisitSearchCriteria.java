package org.egov.amc.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledVisitSearchCriteria {
    private String tenantId;
    private List<String> ids;
    private List<String> amcConfigurationIds;
    private List<String> facilityIds;
    private List<String> projectsIds;
    private List<String> statuses;
    private Long scheduledDateFrom;
    private Long scheduledDateTo;
    private Long actualDateFrom;
    private Long actualDateTo;
    private List<Integer> visitNumbers;
    private List<String> assignedUsers;
    private String facilityName;
    private List<String> vendorIds;
    private List<String> states;      // boundary code strings, e.g. "India_Karnataka"
    private List<String> districts;   // boundary code strings
    private List<String> blocks;      // boundary code strings
    private Boolean delayed;
//    private Boolean rejected;
    @JsonProperty("sort_direction")
    private String sortDirection;
    private Boolean includeExpired;
    private boolean isActive;
    private boolean isCountQuery;

    // ---- Livelihood (LLD §6.9) ----
    /** SYSTEM / REVIEWER (Auto-Approved tab = statuses [APPROVED] + approvedBy SYSTEM). */
    private String approvedBy;
    /** Review SLA breached (PENDING_APPROVAL only); same rule as the slaBreached response field. */
    private Boolean slaBreached;
    private Long latestSubmissionFrom;
    private Long latestSubmissionTo;
    /** End-user name (contains, any case) or an exact 10-digit phone. */
    private String searchText;
    private List<String> activityFacilityIds;
    /** scheduledDate | lastModifiedTime | latestSubmissionDate; default scheduledDate for New lists, else lastModifiedTime. */
    private String sortBy;
    /** G1: add siteDetails to every visit in the page (one batched read per page). */
    private Boolean includeSiteDetails;

    /** Worked out by the service, not sent by clients: start (00:00 IST) of today - reviewSlaDays + 1. */
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Long slaCutoff;
    /** Worked out by the service: searchText as an encrypted phone (egov-enc, deterministic). */
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String searchPhoneCipher;
}
