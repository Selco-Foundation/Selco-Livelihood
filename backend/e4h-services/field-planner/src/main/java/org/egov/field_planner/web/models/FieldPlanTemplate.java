package org.egov.field_planner.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.models.AuditDetails;
import org.springframework.validation.annotation.Validated;

import java.util.List;
import java.util.Map;

/**
 * The Project Manager's filled IC Report template for one Solution within one Installation
 * Plan (FR-08). One row per (fieldPlanId, solutionId) -- every End User Site in the Plan
 * running that Solution shares it, so a Plan of 40 Pulverizer sites has a single Pulverizer
 * template.
 *
 * Backed by the pre-existing field_plan_template table, re-keyed from
 * (system_type, total_capacity) onto solution_id. Its system_type, total_capacity and
 * file_store_id columns belong to that abandoned keying and are left unset.
 */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FieldPlanTemplate {

    @JsonProperty("id")
    private String id = null;

    @JsonProperty("tenantId")
    private String tenantId = null;

    @JsonProperty("fieldPlanId")
    private String fieldPlanId = null;

    /** The MDMS Installation.Solution code, the same value field_plan_facilities.solution_id holds. */
    @JsonProperty("solutionId")
    private String solutionId = null;

    /**
     * One entry per machine, in order. The Nth entry becomes the MACHINE asset with
     * component_sequence = N at Vendor Assignment, so entry order is a contract rather than a
     * presentation detail. Legitimately empty for solar-only Solutions such as Textile Lighting.
     *
     * Untyped line-item maps rather than a fixed model: they mirror whatever the source ICC
     * workbook carries for that Solution and are copied verbatim into bom.data later, so
     * typing them here would mean changing this model every time a parts list gains a field.
     */
    @JsonProperty("machineSection")
    private @Valid List<Map<String, Object>> machineSection = null;

    /** Solar bundle line items, each carrying its category. */
    @JsonProperty("solarSection")
    private @Valid List<Map<String, Object>> solarSection = null;

    @JsonProperty("tenderNumber")
    private String tenderNumber = null;

    /**
     * Optional here. The Field Technician can enter or correct it on site, and it is only
     * enforced at their Submit step -- never at template upload or at Publish.
     */
    @JsonProperty("purchaseOrderNumber")
    private String purchaseOrderNumber = null;

    /**
     * The whole template as a flat {fieldName: value} map -- the contract the mobile app and the
     * PDF generator bind to. Field names come from MDMS (livelihood.BOMFormSchema), assigned by
     * position at upload time, and Vendor Assignment slices this map into each asset's bom.data.
     *
     * Blanks are present as "" rather than omitted: a constant key set is the entire point, so no
     * consumer should ever have to tell "absent" from "blank". The per-line-item arrays above keep
     * their existing behaviour of omitting blank make/quantity.
     */
    @JsonProperty("fields")
    private Map<String, Object> fields = null;

    /**
     * Provenance for the names above: which MDMS forms they came from, the 93 system-parameter
     * names Vendor Assignment seeds onto the SOLAR asset, and the category fingerprint the
     * workbook matched when it was uploaded. Kept so an operator can see that MDMS has drifted
     * since this row was named without having to re-query it.
     */
    @JsonProperty("formMeta")
    private Map<String, Object> formMeta = null;

    @JsonProperty("auditDetails")
    protected @Valid AuditDetails auditDetails;
}
