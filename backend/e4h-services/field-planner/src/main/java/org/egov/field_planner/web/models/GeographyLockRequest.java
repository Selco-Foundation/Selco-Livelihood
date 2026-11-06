package org.egov.field_planner.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.validation.annotation.Validated;

/**
 * Asks which geography codes cannot be removed. Exactly one target: {@code projectId} for a
 * project's geography (codes used by any of its plans), or {@code fieldPlanId} for one plan's
 * geography (codes holding a scoped end-user site).
 */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GeographyLockRequest {
    @JsonProperty("RequestInfo")
    private @NotNull @Valid RequestInfo requestInfo;

    @JsonProperty("projectId")
    private String projectId;

    @JsonProperty("fieldPlanId")
    private String fieldPlanId;
}
