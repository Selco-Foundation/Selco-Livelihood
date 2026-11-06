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

@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FieldPlanTemplateRequest {

    @JsonProperty("RequestInfo")
    private @NotNull @Valid RequestInfo requestInfo = null;

    /**
     * Single rather than a bulk list: the Project Manager downloads, fills and uploads one
     * workbook per Solution, so there is never more than one template in flight per call.
     */
    @JsonProperty("FieldPlanTemplate")
    private @NotNull @Valid FieldPlanTemplate fieldPlanTemplate = null;
}
