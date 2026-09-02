package org.egov.field_planner.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.validation.annotation.Validated;

/**
 * A Solution's BLANK IC Report template: a pointer to the workbook in filestore that the
 * Project Manager downloads and fills in. Seeded once per Solution from the source ICC
 * workbook; read on every template download.
 *
 * Backed by the pre-existing icc_templates table, re-keyed from
 * (system_type, total_system_capacity) onto solution_code.
 */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class IccTemplate {

    @JsonProperty("id")
    private String id = null;

    @JsonProperty("tenantId")
    private String tenantId = null;

    @JsonProperty("solutionCode")
    private String solutionCode = null;

    /** Denormalised for readability when inspecting the table; nothing joins on it. */
    @JsonProperty("solutionName")
    private String solutionName = null;

    @JsonProperty("fileStoreId")
    private String fileStoreId = null;
}
