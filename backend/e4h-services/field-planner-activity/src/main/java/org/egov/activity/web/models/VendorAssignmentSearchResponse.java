package org.egov.activity.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
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
public class VendorAssignmentSearchResponse {

    @JsonProperty("ResponseInfo")
    private ResponseInfo responseInfo = null;

    @JsonProperty("Sites")
    private @Valid List<VendorAssignmentSite> sites = null;

    @JsonProperty("TotalAssets")
    private Integer totalAssets = 0;

    /**
     * False once the plan has been published — the screen renders read-only. Assignment is
     * one-shot, so there is no path back to editable.
     */
    @JsonProperty("assignable")
    private Boolean assignable = Boolean.TRUE;

    @JsonProperty("planStatus")
    private String planStatus = null;
}
