package org.egov.field_planner.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.egov.common.contract.models.AuditDetails;
import org.egov.field_planner.repository.rowmapper.FieldPlanTemplateRowMapper;
import org.egov.field_planner.repository.rowmapper.IccTemplateRowMapper;
import org.egov.field_planner.web.models.FieldPlanTemplate;
import org.egov.field_planner.web.models.FieldPlanTemplateSearchCriteria;
import org.egov.field_planner.web.models.IccTemplate;
import org.postgresql.util.PGobject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.util.CollectionUtils;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Plain JdbcTemplate rather than the GenericRepository/Producer pattern the rest of this
 * service uses for writes. That pattern pushes onto Kafka for egov-persister to apply, but
 * the persister config lives outside this repository and has no mapping for either of these
 * tables -- so a pushed write would simply never land. Same reasoning as
 * FieldPlannerFacilityService.persistFieldPlanFacilities.
 */
@Repository
@Slf4j
public class FieldPlanTemplateRepository {

    private static final String SELECT_TEMPLATE =
            "SELECT fpt.id AS fpt_id, fpt.tenant_id AS fpt_tenantId, fpt.field_plan_id AS fpt_fieldPlanId, "
                    + "fpt.solution_id AS fpt_solutionId, fpt.template_data AS fpt_templateData, "
                    + "fpt.tender_number AS fpt_tenderNumber, fpt.purchase_order_number AS fpt_purchaseOrderNumber, "
                    + "fpt.created_by AS fpt_createdBy, fpt.created_time AS fpt_createdTime, "
                    + "fpt.last_modified_by AS fpt_lastModifiedBy, fpt.last_modified_time AS fpt_lastModifiedTime "
                    + "FROM field_plan_template fpt ";

    /**
     * Upsert, not insert: the Project Manager can correct and re-upload a Solution's template
     * any number of times before Publish, and each upload replaces the previous content rather
     * than adding a row. created_by/created_time are left alone on conflict so the original
     * authorship survives a correction.
     *
     * system_type, total_capacity and file_store_id are not named at all -- they belong to the
     * table's abandoned (system_type, total_capacity) keying and were made nullable for this.
     */
    private static final String UPSERT_TEMPLATE =
            "INSERT INTO field_plan_template "
                    + "(id, tenant_id, field_plan_id, solution_id, template_data, tender_number, "
                    + " purchase_order_number, created_by, created_time, last_modified_by, last_modified_time) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
                    + "ON CONFLICT (tenant_id, field_plan_id, solution_id) DO UPDATE SET "
                    + " template_data = EXCLUDED.template_data, "
                    + " tender_number = EXCLUDED.tender_number, "
                    + " purchase_order_number = EXCLUDED.purchase_order_number, "
                    + " last_modified_by = EXCLUDED.last_modified_by, "
                    + " last_modified_time = EXCLUDED.last_modified_time";

    private static final String SELECT_ICC =
            "SELECT icc.id AS icc_id, icc.tenant_id AS icc_tenantId, icc.solution_code AS icc_solutionCode, "
                    + "icc.solution_name AS icc_solutionName, icc.filestoreid AS icc_fileStoreId "
                    + "FROM icc_templates icc WHERE icc.tenant_id = ? AND icc.solution_code IS NOT NULL ";

    private final JdbcTemplate jdbcTemplate;
    private final FieldPlanTemplateRowMapper templateRowMapper;
    private final IccTemplateRowMapper iccRowMapper;
    private final ObjectMapper objectMapper;

    @Autowired
    public FieldPlanTemplateRepository(JdbcTemplate jdbcTemplate,
                                       FieldPlanTemplateRowMapper templateRowMapper,
                                       IccTemplateRowMapper iccRowMapper,
                                       @Qualifier("objectMapper") ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.templateRowMapper = templateRowMapper;
        this.iccRowMapper = iccRowMapper;
        this.objectMapper = objectMapper;
    }

    public void save(FieldPlanTemplate template) {
        AuditDetails audit = template.getAuditDetails();
        // LinkedHashMap so the two sections keep a predictable order in the stored JSON, which
        // makes the column readable when someone inspects a row by hand.
        Map<String, Object> templateData = new LinkedHashMap<>();
        templateData.put("machineSection", template.getMachineSection() == null
                ? List.of() : template.getMachineSection());
        templateData.put("solarSection", template.getSolarSection() == null
                ? List.of() : template.getSolarSection());

        jdbcTemplate.update(UPSERT_TEMPLATE,
                template.getId(),
                template.getTenantId(),
                template.getFieldPlanId(),
                template.getSolutionId(),
                toJsonb(templateData),
                template.getTenderNumber(),
                template.getPurchaseOrderNumber(),
                audit == null ? null : audit.getCreatedBy(),
                audit == null ? null : audit.getCreatedTime(),
                audit == null ? null : audit.getLastModifiedBy(),
                audit == null ? null : audit.getLastModifiedTime());

        log.info("persisted field plan template for fieldPlanId={} solutionId={} ({} machine, {} solar line items)",
                template.getFieldPlanId(), template.getSolutionId(),
                template.getMachineSection() == null ? 0 : template.getMachineSection().size(),
                template.getSolarSection() == null ? 0 : template.getSolarSection().size());
    }

    public List<FieldPlanTemplate> search(FieldPlanTemplateSearchCriteria criteria) {
        StringBuilder query = new StringBuilder(SELECT_TEMPLATE)
                .append("WHERE fpt.tenant_id = ? AND fpt.field_plan_id = ? AND fpt.solution_id IS NOT NULL");
        List<Object> params = new ArrayList<>();
        params.add(criteria.getTenantId());
        params.add(criteria.getFieldPlanId());

        if (!CollectionUtils.isEmpty(criteria.getSolutionIds())) {
            query.append(" AND fpt.solution_id IN (")
                    .append("?,".repeat(criteria.getSolutionIds().size() - 1))
                    .append("?)");
            params.addAll(criteria.getSolutionIds());
        }
        query.append(" ORDER BY fpt.solution_id");

        return jdbcTemplate.query(query.toString(), templateRowMapper, params.toArray());
    }

    /** Blank templates seeded per Solution. Pass no codes to list them all. */
    public List<IccTemplate> searchIccTemplates(String tenantId, List<String> solutionCodes) {
        StringBuilder query = new StringBuilder(SELECT_ICC);
        List<Object> params = new ArrayList<>();
        params.add(tenantId);

        if (!CollectionUtils.isEmpty(solutionCodes)) {
            query.append(" AND icc.solution_code IN (")
                    .append("?,".repeat(solutionCodes.size() - 1))
                    .append("?)");
            params.addAll(solutionCodes);
        }
        query.append(" ORDER BY icc.solution_code");

        return jdbcTemplate.query(query.toString(), iccRowMapper, params.toArray());
    }

    /**
     * Postgres will not accept a Java String into a jsonb column through a plain setObject,
     * so the value is wrapped with its type declared explicitly.
     */
    private PGobject toJsonb(Object value) {
        PGobject jsonb = new PGobject();
        jsonb.setType("jsonb");
        try {
            jsonb.setValue(objectMapper.writeValueAsString(value));
        } catch (JsonProcessingException | SQLException e) {
            throw new IllegalStateException("Could not serialise field plan template sections", e);
        }
        return jsonb;
    }
}
