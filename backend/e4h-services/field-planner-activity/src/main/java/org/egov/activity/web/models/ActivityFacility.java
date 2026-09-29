package org.egov.activity.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.models.AuditDetails;
import org.egov.common.models.core.AdditionalFields;
import org.springframework.validation.annotation.Validated;

import java.util.List;
import java.util.Map;

@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ActivityFacility {

    @JsonProperty("facilityId")
    private String facilityId = null;

    @JsonProperty("facility")
    private Facility facility = null;

    @JsonProperty("assignedUser")
    private String assignedUser = null;

    @JsonProperty("assignedEmployeeUser")
    private User assignedEmployeeUser = null;

    @JsonProperty("fieldStaffUsers")
    private List<String> fieldStaffUsers = null;

    @JsonProperty("fieldSupervisorUsers")
    private List<String> fieldSupervisorUsers = null;

    @JsonProperty("reviewerUser")
    private List<String> reviewerUser = null;

    @JsonProperty("linkedUsers")
    private List<String> linkedUsers = null;

    @JsonProperty("fieldPlanId")
    private String fieldPlanId = null;

    @JsonProperty("fieldPlan")
    private FieldPlan fieldPlan = null;

    @JsonProperty("id")
    protected String id;

    @JsonProperty("tenantId")
    protected String tenantId;

    @JsonProperty("activityId")
    protected String activityId;

    /**
     * SOLAR | MACHINE. One row per installable asset rather than one per site: a site's Solution
     * expands into one SOLAR asset for the whole solar section plus one MACHINE asset per machine,
     * each independently vendor-assigned and independently reviewed through its own
     * FACILITY_INSTALLATION process instance.
     *
     * Null for every non-installation activity type, which stays one row per
     * (facility, activity, plan) -- the unique index folds NULL to '' so that guarantee holds.
     */
    @JsonProperty("componentType")
    private String componentType = null;

    /** 1-based within a componentType. SOLAR is always 1; MACHINE runs 1..N in template order. */
    @JsonProperty("componentSequence")
    private Integer componentSequence = null;

    /** Denormalised from field_plan_facilities.solution_id -- identical across a site's assets. */
    @JsonProperty("solutionId")
    private String solutionId = null;

    @JsonProperty("activityType")
    protected String activityType;

    @JsonProperty("scheduledAt")
    private Long scheduledAt = null;

    @JsonProperty("activatedAt")
    private Long activatedAt = null;

    @JsonProperty("completedAt")
    private Long completedAt = null;

    @JsonProperty("status")
    private String status = null;

    @JsonProperty("isDeleted")
    private Boolean isDeleted;

    @JsonProperty("additionalDetails")
    private Map<String, Object> additionalDetails = null;

    @JsonProperty("billOfMaterial")
    private BillOfMaterial billOfMaterial = null;

    @JsonProperty("conditionsMet")
    private Object conditionsMet = null;

    @JsonProperty("hasErrors")
    protected Boolean hasErrors = Boolean.FALSE;

    @JsonProperty("additionalFields")
    protected @Valid AdditionalFields additionalFields;

    @JsonProperty("auditDetails")
    protected @Valid AuditDetails auditDetails;
}
