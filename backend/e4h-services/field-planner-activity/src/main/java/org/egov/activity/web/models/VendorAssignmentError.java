package org.egov.activity.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.validation.annotation.Validated;

/**
 * One validation failure. The asset coordinates are null for plan-level problems (a missing
 * template, no reviewer) which have no single row to attach to; otherwise they identify exactly
 * which row of the grid to highlight.
 */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VendorAssignmentError {

    @JsonProperty("facilityId")
    private String facilityId = null;

    @JsonProperty("componentType")
    private String componentType = null;

    @JsonProperty("componentSequence")
    private Integer componentSequence = null;

    @JsonProperty("code")
    private String code = null;

    @JsonProperty("message")
    private String message = null;
}
