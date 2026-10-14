package org.egov.field_planner.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.lang3.StringUtils;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Read-only lookups behind the geography locks: the geography of a project's plans, and the
 * boundary of every site in one plan's scope. Deleted plans and deleted scope rows never lock
 * anything -- removing a site from scope soft-deletes its row, which is exactly what frees its
 * geography again.
 *
 * Joins facility directly, the same way FieldPlannerQueryBuilder already joins project: all
 * Livelihood services share one database. Plans and projects are keyed by UUID, so no tenant
 * filter is applied (field-planner stores plans under a tenant prefix, not one exact value).
 */
@Repository
public class GeographyLockRepository {

    private static final String PLAN_GEOGRAPHY =
            "SELECT fp.id, fp.name, fp.geography_scope FROM field_plans fp "
                    + "WHERE COALESCE(fp.isdeleted, false) = false ";

    private static final String SCOPED_SITES =
            "SELECT f.boundary_code FROM field_plan_facilities fpf "
                    + "JOIN facility f ON f.id = fpf.facility_id "
                    + "WHERE fpf.field_plan_id = ? AND COALESCE(fpf.isdeleted, false) = false "
                    + "AND f.boundary_code IS NOT NULL";

    public record PlanGeography(String id, String name, Map<String, Object> geography) {}

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper mapper;

    public GeographyLockRepository(JdbcTemplate jdbcTemplate, @Qualifier("objectMapper") ObjectMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    /** Every non-deleted plan of the project, in any status. */
    public List<PlanGeography> findProjectPlans(String projectId) {
        return jdbcTemplate.query(PLAN_GEOGRAPHY + "AND fp.project_id = ?",
                (rs, rowNum) -> toPlanGeography(rs), projectId);
    }

    public Optional<PlanGeography> findPlan(String fieldPlanId) {
        return jdbcTemplate.query(PLAN_GEOGRAPHY + "AND fp.id = ?",
                (rs, rowNum) -> toPlanGeography(rs), fieldPlanId).stream().findFirst();
    }

    /** The boundary code of every live site in the plan's scope. */
    public List<String> findScopedSiteBoundaries(String fieldPlanId) {
        return jdbcTemplate.queryForList(SCOPED_SITES, String.class, fieldPlanId);
    }

    private PlanGeography toPlanGeography(ResultSet rs) throws SQLException {
        String json = rs.getString("geography_scope");
        Map<String, Object> geography = Collections.emptyMap();
        if (StringUtils.isNotBlank(json)) {
            try {
                geography = mapper.readValue(json, new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                throw new CustomException("FIELDPLAN_GEOGRAPHY_PARSE_ERROR",
                        "Could not read the geography of field plan " + rs.getString("id"));
            }
        }
        return new PlanGeography(rs.getString("id"), rs.getString("name"), geography);
    }
}
