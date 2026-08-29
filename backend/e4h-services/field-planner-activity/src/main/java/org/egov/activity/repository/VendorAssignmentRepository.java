package org.egov.activity.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.egov.activity.web.models.VendorAssignmentSubmission;
import org.postgresql.util.PGobject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reads and writes for the Vendor Assignment step.
 *
 * Plain JdbcTemplate throughout. The writes deliberately bypass the Kafka/egov-persister path
 * that ActivityService and BomService use: that config lives outside this repository and has no
 * mapping for the component or vendor columns, so a pushed write would silently drop them --
 * exactly how field_plans.sector was lost. Both services also swallow their own write
 * exceptions, which would defeat the all-or-nothing transaction this step depends on
 *
 * Several of the reads target tables field-planner migrates (field_plan_facilities,
 * field_plan_template, field_plans, activity_assignments). That is existing practice here, not a
 * new coupling -- this service already queries facility_activities the same way.
 */
@Repository
@Slf4j
public class VendorAssignmentRepository {

    private static final TypeReference<Map<String, Object>> JSON_MAP =
            new TypeReference<Map<String, Object>>() {
            };

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    @Autowired
    public VendorAssignmentRepository(JdbcTemplate jdbcTemplate,
                                      @Qualifier("objectMapper") ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    // ---------------------------------------------------------------- reads

    /** The plan itself. Null when it does not exist. */
    public Map<String, Object> findPlan(String tenantId, String fieldPlanId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, name, status, project_id, start_date, sector FROM field_plans "
                        + "WHERE tenant_id = ? AND id = ?",
                tenantId, fieldPlanId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /**
     * The sites in scope: facility_id, solution_id and the site's display name. Ordered by name
     * so the grid is stable and readable.
     *
     * `facility` is joined directly rather than fetched over HTTP: it lives in the same database
     * and the existing activity search already joins it exactly this way
     * (ActivityQueryBuilder's `LEFT JOIN public.facility`).
     */
    public List<Map<String, Object>> findScope(String tenantId, String fieldPlanId) {
        // Note `fpf.tenantid`, not `tenant_id` -- V20250924180100 renamed it on this table only.
        return jdbcTemplate.queryForList(
                "SELECT fpf.facility_id, fpf.solution_id, fac.facility_name "
                        + "FROM field_plan_facilities fpf "
                        + "LEFT JOIN public.facility fac ON fac.id = fpf.facility_id "
                        + "WHERE fpf.tenantid = ? AND fpf.field_plan_id = ? "
                        + "AND COALESCE(fpf.isdeleted, false) = false "
                        + "ORDER BY fac.facility_name NULLS LAST, fpf.facility_id",
                tenantId, fieldPlanId);
    }

    /** {solution_id: template_data} for this plan's filled IC Report templates. */
    public Map<String, Map<String, Object>> findTemplates(String tenantId, String fieldPlanId) {
        Map<String, Map<String, Object>> templates = new LinkedHashMap<>();
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT solution_id, template_data FROM field_plan_template "
                        + "WHERE tenant_id = ? AND field_plan_id = ? AND solution_id IS NOT NULL",
                tenantId, fieldPlanId);
        for (Map<String, Object> row : rows) {
            templates.put((String) row.get("solution_id"),
                    readJson(row.get("template_data") == null ? null : String.valueOf(row.get("template_data"))));
        }
        return templates;
    }

    /**
     * The installation activity's id. Matched on `code`, never on a uuid -- the activity is
     * seeded with code 'INS' and its id differs per environment.
     */
    public String findActivityIdByCode(String tenantId, String code) {
        List<String> ids = jdbcTemplate.queryForList(
                "SELECT id FROM activities WHERE tenant_id = ? AND code = ? AND COALESCE(is_active, true) = true",
                String.class, tenantId, code);
        return ids.isEmpty() ? null : ids.get(0);
    }

    /** Users assigned to this plan in the given role, e.g. INSTALLATION_REVIEWER. */
    public List<String> findAssignedUsersByRole(String tenantId, String fieldPlanId, String roleCode) {
        return jdbcTemplate.queryForList(
                // `role` is a SQL reserved word and the column was created quoted, so it is
                // qualified with an alias here -- the same way ActivityAssignmentQueryBuilder
                // does it (aa.role ->> 'code').
                "SELECT aa.assigned_to FROM activity_assignments aa "
                        + "WHERE aa.tenant_id = ? AND aa.field_plan_id = ? AND aa.role ->> 'code' = ? "
                        + "AND COALESCE(aa.isdeleted, false) = false AND aa.assigned_to IS NOT NULL",
                String.class, tenantId, fieldPlanId, roleCode);
    }

    /**
     * Facility ids already published in a *different* plan of the same project, with the plan
     * that holds each. Published means the owning plan reached SCHEDULED -- the same derivation
     * the Installation Scope step's bar uses, so the two cannot drift apart.
     */
    public Map<String, String> findSitesPublishedElsewhere(String tenantId, String projectId,
                                                            String currentFieldPlanId, String publishedStatus) {
        Map<String, String> barred = new LinkedHashMap<>();
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT fpf.facility_id, fp.name AS plan_name FROM field_plan_facilities fpf "
                        + "JOIN field_plans fp ON fp.id = fpf.field_plan_id "
                        + "WHERE fp.tenant_id = ? AND fp.project_id = ? AND fp.id <> ? "
                        + "AND fp.status = ? AND COALESCE(fpf.isdeleted, false) = false",
                tenantId, projectId, currentFieldPlanId, publishedStatus);
        for (Map<String, Object> row : rows) {
            barred.putIfAbsent((String) row.get("facility_id"), (String) row.get("plan_name"));
        }
        return barred;
    }

    /** Asset rows already created for this plan, with their vendor assignment. */
    public List<Map<String, Object>> findExistingAssets(String tenantId, String fieldPlanId) {
        // facility_name is joined the same way findScope joins it: a submitted plan must render
        // with the same site names the assignment grid showed, not blanks.
        // SOLAR is ordered ahead of MACHINE explicitly rather than alphabetically, so reopening a
        // submitted plan lists the assets in the order they were assigned in.
        return jdbcTemplate.queryForList(
                "SELECT fa.facility_id, fa.component_type, fa.component_sequence, fa.solution_id, "
                        + "       fac.facility_name, "
                        + "       b.vendor_org_id, b.assign_user, b.vendor_email, b.vendor_phone, "
                        + "       b.report_number, b.additional_details "
                        + "FROM facility_activities fa "
                        + "LEFT JOIN bom b ON b.activity_facility_id = fa.id "
                        + "LEFT JOIN public.facility fac ON fac.id = fa.facility_id "
                        + "WHERE fa.tenant_id = ? AND fa.field_plan_id = ? AND fa.component_type IS NOT NULL "
                        + "AND COALESCE(fa.isdeleted, false) = false "
                        + "ORDER BY fac.facility_name NULLS LAST, fa.facility_id, "
                        + "         CASE WHEN fa.component_type = 'SOLAR' THEN 0 ELSE 1 END, "
                        + "         fa.component_sequence",
                tenantId, fieldPlanId);
    }

    // --------------------------------------------------------------- writes

    /**
     * Upsert on the composite unique index added by field-planner's V20260827100200. Upsert
     * rather than insert so a retry after a rolled-back transaction cannot collide with a
     * half-written row -- there should be none, but the guarantee is free.
     */
    private static final String UPSERT_FACILITY_ACTIVITY =
            "INSERT INTO facility_activities "
                    + "(id, tenant_id, facility_id, activity_id, field_plan_id, component_type, "
                    + " component_sequence, solution_id, status, scheduled_at, activated_at, "
                    + " assigned_user, created_time, last_modified_time, isdeleted) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false) "
                    + "ON CONFLICT (tenant_id, facility_id, activity_id, field_plan_id, "
                    + "             COALESCE(component_type, ''), COALESCE(component_sequence, 0)) "
                    + "DO UPDATE SET solution_id = EXCLUDED.solution_id, "
                    + " status = EXCLUDED.status, scheduled_at = EXCLUDED.scheduled_at, "
                    + " activated_at = EXCLUDED.activated_at, assigned_user = EXCLUDED.assigned_user, "
                    + " last_modified_time = EXCLUDED.last_modified_time "
                    + "RETURNING id";

    /** Returns the row's id, whether freshly inserted or already present. */
    public String upsertFacilityActivity(String id, String tenantId, String facilityId, String activityId,
                                         String fieldPlanId, String componentType, Integer componentSequence,
                                         String solutionId, String status, Long scheduledAt,
                                         String assignedUser, Long now) {
        return jdbcTemplate.queryForObject(UPSERT_FACILITY_ACTIVITY, String.class,
                id, tenantId, facilityId, activityId, fieldPlanId, componentType, componentSequence,
                solutionId, status, scheduledAt, scheduledAt, assignedUser, now, now);
    }

    private static final String UPSERT_BOM =
            "INSERT INTO bom "
                    + "(id, tenant_id, name, facility_id, activity_facility_id, solution_id, "
                    + " assign_user, vendor_org_id, vendor_email, vendor_phone, report_number, "
                    + " data, additional_details, is_active, created_time, last_modified_time) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?) "
                    + "ON CONFLICT (id) DO UPDATE SET "
                    + " assign_user = EXCLUDED.assign_user, vendor_org_id = EXCLUDED.vendor_org_id, "
                    + " vendor_email = EXCLUDED.vendor_email, vendor_phone = EXCLUDED.vendor_phone, "
                    + " report_number = EXCLUDED.report_number, data = EXCLUDED.data, "
                    + " additional_details = EXCLUDED.additional_details, "
                    + " last_modified_time = EXCLUDED.last_modified_time";

    public void upsertBom(String id, String tenantId, String name, String facilityId,
                          String activityFacilityId, String solutionId,
                          VendorAssignmentSubmission vendor, String reportNumber,
                          Map<String, Object> data, Map<String, Object> additionalDetails, Long now) {
        jdbcTemplate.update(UPSERT_BOM,
                id, tenantId, name, facilityId, activityFacilityId, solutionId,
                vendor.getVendorUserId(), vendor.getVendorOrgId(), vendor.getVendorEmail(),
                vendor.getVendorPhone(), reportNumber,
                toJsonb(data), toJsonb(additionalDetails), now, now);
    }

    /** Existing bom row id for an asset, so a retry reuses it instead of orphaning one. */
    public String findBomIdByActivityFacility(String tenantId, String activityFacilityId) {
        List<String> ids = jdbcTemplate.queryForList(
                "SELECT id FROM bom WHERE tenant_id = ? AND activity_facility_id = ?",
                String.class, tenantId, activityFacilityId);
        return ids.isEmpty() ? null : ids.get(0);
    }

    /**
     * The handover. Guarded on the current status so two concurrent submits cannot both believe
     * they published: the second updates zero rows and the caller aborts.
     */
    public int publishPlan(String tenantId, String fieldPlanId, String fromStatus, String toStatus,
                           String lastModifiedBy, Long now) {
        return jdbcTemplate.update(
                "UPDATE field_plans SET status = ?, last_modified_by = ?, last_modified_time = ? "
                        + "WHERE tenant_id = ? AND id = ? AND status = ?",
                toStatus, lastModifiedBy, now, tenantId, fieldPlanId, fromStatus);
    }

    // --------------------------------------------------------------- helpers

    public Map<String, Object> readJson(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, JSON_MAP);
        } catch (Exception e) {
            throw new IllegalStateException("Malformed JSON column while reading vendor assignment data", e);
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> readSection(Map<String, Object> templateData, String key) {
        Object raw = templateData == null ? null : templateData.get(key);
        if (raw instanceof List<?> list) {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    out.add((Map<String, Object>) map);
                }
            }
            return out;
        }
        return List.of();
    }

    private PGobject toJsonb(Object value) {
        PGobject jsonb = new PGobject();
        jsonb.setType("jsonb");
        try {
            jsonb.setValue(objectMapper.writeValueAsString(value == null ? Map.of() : value));
        } catch (Exception e) {
            throw new IllegalStateException("Could not serialise vendor assignment JSON", e);
        }
        return jsonb;
    }
}
