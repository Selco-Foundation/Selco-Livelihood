package org.egov.field_planner.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FieldPlanTemplateSearchCriteria {

    @JsonProperty("tenantId")
    private String tenantId = null;

    /**
     * Required. Templates are only meaningful within one Plan, and the plan-wide read is what
     * Publish validation uses to check every unique Solution has a template.
     */
    @JsonProperty("fieldPlanId")
    private String fieldPlanId = null;

    /** Optional narrowing; omit to get every template in the Plan. */
    @JsonProperty("solutionIds")
    private @Valid List<String> solutionIds = null;
}
