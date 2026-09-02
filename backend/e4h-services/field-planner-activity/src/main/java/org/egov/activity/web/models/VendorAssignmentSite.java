package org.egov.activity.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * One End User Site with its assets, grouped so the screen can render the PRD's layout —
 * the site's name spanning its asset rows.
 */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VendorAssignmentSite {

    @JsonProperty("facilityId")
    private String facilityId = null;

    @JsonProperty("siteName")
    private String siteName = null;

    @JsonProperty("solutionId")
    private String solutionId = null;

    @JsonProperty("solutionName")
    private String solutionName = null;

    @JsonProperty("assets")
    private @Valid List<VendorAssignmentAsset> assets = null;
}
