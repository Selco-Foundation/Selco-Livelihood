package org.egov.field_planner.repository;

import lombok.extern.slf4j.Slf4j;
import org.egov.field_planner.repository.rowmapper.FieldPlanTemplateRowMapper;
import org.egov.field_planner.repository.rowmapper.IccTemplateRowMapper;
import org.egov.field_planner.web.models.FieldPlanTemplate;
import org.egov.field_planner.web.models.FieldPlanTemplateSearchCriteria;
import org.egov.field_planner.web.models.IccTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Reads for the per-Solution IC Report templates: the filled ones from field_plan_template, and
 * the blank filestore pointers from icc_templates. Read-only.
 *
 * It used to own a JDBC upsert for field_plan_template, because the egov-persister config was not
 * visible from this repository and had no mapping for the table -- so a pushed write would simply
 * never have landed. That config (Configs-Livelihood/egov-persister/field-plan-persister.yml) now
 * has a save-field-plan-template mapping, so FieldPlanTemplateService publishes instead. The
 * payload shape it publishes is documented there and in that service; the two have to agree.
 *
 * icc_templates has no mapping and needs none: it is seed data, 14 rows, with no service write
 * path at all.
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


    private static final String SELECT_ICC =
            "SELECT icc.id AS icc_id, icc.tenant_id AS icc_tenantId, icc.solution_code AS icc_solutionCode, "
                    + "icc.solution_name AS icc_solutionName, icc.filestoreid AS icc_fileStoreId "
                    + "FROM icc_templates icc WHERE icc.tenant_id = ? AND icc.solution_code IS NOT NULL ";

    private final JdbcTemplate jdbcTemplate;
    private final FieldPlanTemplateRowMapper templateRowMapper;
    private final IccTemplateRowMapper iccRowMapper;

    @Autowired
    public FieldPlanTemplateRepository(JdbcTemplate jdbcTemplate,
                                       FieldPlanTemplateRowMapper templateRowMapper,
                                       IccTemplateRowMapper iccRowMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.templateRowMapper = templateRowMapper;
        this.iccRowMapper = iccRowMapper;
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

}
