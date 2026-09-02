package org.egov.activity.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.validation.annotation.Validated;

/**
 * One asset's vendor choice, as submitted.
 *
 * The vendor's name, email and phone come from the caller rather than being re-resolved here:
 * the screen already fetched them from vendor-registry to build its dropdowns, and
 * field-planner-activity has no vendor-registry URL configured. They are cached onto the bom row
 * so the notification and reject-SMS paths need no live lookup, and the technician's task list
 * and the reviewer's grid can show names without one either.
 */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VendorAssignmentSubmission {

    @JsonProperty("facilityId")
    private @NotNull String facilityId = null;

    @JsonProperty("componentType")
    private @NotNull String componentType = null;

    @JsonProperty("componentSequence")
    private @NotNull Integer componentSequence = null;

    @JsonProperty("vendorOrgId")
    private String vendorOrgId = null;

    @JsonProperty("vendorOrgName")
    private String vendorOrgName = null;

    @JsonProperty("vendorUserId")
    private String vendorUserId = null;

    @JsonProperty("vendorUserName")
    private String vendorUserName = null;

    @JsonProperty("vendorEmail")
    private String vendorEmail = null;

    @JsonProperty("vendorPhone")
    private String vendorPhone = null;

    /** Stable key for matching a submission against the derived asset list. */
    public String assetKey() {
        return facilityId + "|" + componentType + "|" + componentSequence;
    }
}
