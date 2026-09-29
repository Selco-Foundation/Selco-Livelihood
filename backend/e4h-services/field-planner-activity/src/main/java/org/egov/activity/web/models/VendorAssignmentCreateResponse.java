package org.egov.activity.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.response.ResponseInfo;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VendorAssignmentCreateResponse {

    @JsonProperty("ResponseInfo")
    private ResponseInfo responseInfo = null;

    @JsonProperty("fieldPlanId")
    private String fieldPlanId = null;

    @JsonProperty("planStatus")
    private String planStatus = null;

    @JsonProperty("siteCount")
    private Integer siteCount = 0;

    @JsonProperty("assetCount")
    private Integer assetCount = 0;

    /** Distinct organisations the work was dispatched to — worth echoing back for the audit trail. */
    @JsonProperty("vendorOrganisations")
    private List<String> vendorOrganisations = null;

    @JsonProperty("message")
    private String message = null;
}
