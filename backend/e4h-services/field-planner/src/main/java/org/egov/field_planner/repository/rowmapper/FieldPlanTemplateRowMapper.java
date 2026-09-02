package org.egov.field_planner.repository.rowmapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.common.contract.models.AuditDetails;
import org.egov.field_planner.web.models.FieldPlanTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

@Component
public class FieldPlanTemplateRowMapper implements RowMapper<FieldPlanTemplate> {

    private static final TypeReference<List<Map<String, Object>>> LINE_ITEMS =
            new TypeReference<List<Map<String, Object>>>() {
            };

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public FieldPlanTemplate mapRow(ResultSet resultSet, int rowNum) throws SQLException {
        Map<String, Object> templateData = readTemplateData(resultSet.getString("fpt_templateData"));
        return FieldPlanTemplate.builder()
                .id(resultSet.getString("fpt_id"))
                .tenantId(resultSet.getString("fpt_tenantId"))
                .fieldPlanId(resultSet.getString("fpt_fieldPlanId"))
                .solutionId(resultSet.getString("fpt_solutionId"))
                .machineSection(section(templateData, "machineSection"))
                .solarSection(section(templateData, "solarSection"))
                .tenderNumber(resultSet.getString("fpt_tenderNumber"))
                .purchaseOrderNumber(resultSet.getString("fpt_purchaseOrderNumber"))
                .auditDetails(AuditDetails.builder()
                        .createdBy(resultSet.getString("fpt_createdBy"))
                        .createdTime(resultSet.getLong("fpt_createdTime"))
                        .lastModifiedBy(resultSet.getString("fpt_lastModifiedBy"))
                        .lastModifiedTime(resultSet.getLong("fpt_lastModifiedTime"))
                        .build())
                .build();
    }

    private Map<String, Object> readTemplateData(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Malformed field_plan_template.template_data JSON", e);
        }
    }

    /**
     * An absent section reads back as an empty list rather than null: callers iterate these to
     * build asset rows, and a solar-only Solution legitimately has no machines. Returning null
     * would make every caller null-check a case that simply means "none".
     */
    private List<Map<String, Object>> section(Map<String, Object> templateData, String key) {
        Object raw = templateData.get(key);
        if (raw == null) {
            return List.of();
        }
        return objectMapper.convertValue(raw, LINE_ITEMS);
    }
}
