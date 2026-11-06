package org.egov.activity.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.validation.annotation.Validated;

@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VendorAssignmentCriteria {

    @JsonProperty("tenantId")
    private @NotNull String tenantId = null;

    @JsonProperty("fieldPlanId")
    private @NotNull String fieldPlanId = null;
}
