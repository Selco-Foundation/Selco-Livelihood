package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.util.BoundaryLocalizationUtil;
import org.egov.amc.util.BoundaryUtil;
import org.egov.amc.web.models.Boundary;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * {@code POST /v1/visit/project-summary/_search} (LLD §6.9): per project, the five reviewer counts from one GROUP BY
 * query on live visits of Livelihood AMCs (a turned-off AMC's pending reviews still count). Projects with none of
 * these visits are not listed. projectName (G9) and paging are applied in SQL.
 */
@Slf4j
@Service
public class ProjectSummaryService {

    public record Criteria(String tenantId, List<String> projectIds, String projectName, List<String> states, List<String> districts,
                           List<String> blocks, Integer offset, Integer limit) {
    }

    record Query(String sql, List<Object> params) {
    }

    private final JdbcTemplate jdbc;
    private final AmcMdmsOptions mdmsOptions;
    private final BoundaryUtil boundaries;
    private final BoundaryLocalizationUtil boundaryNames;

    public ProjectSummaryService(JdbcTemplate jdbc, AmcMdmsOptions mdmsOptions, BoundaryUtil boundaries, BoundaryLocalizationUtil boundaryNames) {
        this.jdbc = jdbc;
        this.mdmsOptions = mdmsOptions;
        this.boundaries = boundaries;
        this.boundaryNames = boundaryNames;
    }

    /** The grouped query, built separately so its conditions are unit-tested. count=true: number of projects only. */
    static Query build(Criteria c, long slaCutoff, boolean count) {
        List<Object> p = new ArrayList<>();
        StringBuilder where = new StringBuilder(" WHERE sv.tenant_id = ? AND sv.is_active AND ac.activity_facility_id IS NOT NULL"
                + " AND sv.status IN ('PENDING_APPROVAL','APPROVED','REJECTED')");
        p.add(c.tenantId());
        if (c.projectIds() != null && !c.projectIds().isEmpty()) {
            where.append(" AND sv.project_id = ANY (?)");
            p.add(c.projectIds().toArray(new String[0]));
        }
        if (c.projectName() != null && !c.projectName().isBlank()) {
            where.append(" AND p.name ILIKE ?");
            p.add("%" + c.projectName().trim() + "%");
        }
        for (List<String> level : java.util.Arrays.asList(c.states(), c.districts(), c.blocks())) {
            if (level != null && !level.isEmpty()) {
                where.append(" AND (");
                for (int i = 0; i < level.size(); i++) {
                    where.append(i > 0 ? " OR " : "").append("starts_with(f.boundary_code, ?)");
                    p.add(level.get(i) + "_");
                }
                where.append(")");
            }
        }
        String from = " FROM scheduled_visits sv JOIN amc_configuration ac ON ac.id = sv.amc_configuration_id"
                + " LEFT JOIN project p ON p.id = sv.project_id LEFT JOIN facility f ON f.id = sv.facility_id";
        if (count) {
            return new Query("SELECT count(DISTINCT sv.project_id)" + from + where, p);
        }
        List<Object> params = new ArrayList<>();
        params.add(slaCutoff);
        params.addAll(p);
        String sql = "SELECT sv.project_id, p.name AS project_name, p.projectnumber AS project_number,"
                + " COUNT(*) FILTER (WHERE sv.status = 'PENDING_APPROVAL') AS pending,"
                + " COUNT(*) FILTER (WHERE sv.status = 'PENDING_APPROVAL' AND sv.latest_submission_date < ?) AS breached,"
                + " COUNT(*) FILTER (WHERE sv.status = 'APPROVED' AND sv.approved_by = 'SYSTEM') AS auto_approved,"
                + " COUNT(*) FILTER (WHERE sv.status = 'APPROVED' AND sv.approved_by = 'REVIEWER') AS reviewer_approved,"
                + " COUNT(*) FILTER (WHERE sv.status = 'REJECTED') AS rework,"
                + " array_agg(DISTINCT f.boundary_code) AS boundary_codes"
                + from + where
                + " GROUP BY sv.project_id, p.name, p.projectnumber ORDER BY p.name NULLS LAST, sv.project_id LIMIT ? OFFSET ?";
        params.add(c.limit() == null || c.limit() <= 0 ? 10 : Math.min(c.limit(), 100));
        params.add(c.offset() == null || c.offset() < 0 ? 0 : c.offset());
        return new Query(sql, params);
    }

    public Map<String, Object> search(Criteria c, RequestInfo requestInfo) {
        int slaDays = AmcMdmsOptions.DEFAULT_REVIEW_SLA_DAYS;
        try {
            slaDays = mdmsOptions.configDays(c.tenantId(), requestInfo).reviewSlaDays();
        } catch (RuntimeException e) {
            log.warn("AMC.Config not read for project summary, using {} days: {}", slaDays, e.getMessage());
        }
        long cutoff = VisitReadFields.slaCutoff(slaDays, System.currentTimeMillis());
        Query q = build(c, cutoff, false);
        List<Map<String, Object>> projects = new ArrayList<>();
        Map<String, Set<String>> codesByProject = new LinkedHashMap<>();
        jdbc.query(q.sql(), (org.springframework.jdbc.core.RowCallbackHandler) rs -> {
            Map<String, Object> m = new LinkedHashMap<>();
            String id = rs.getString("project_id");
            m.put("projectId", id);
            m.put("projectName", rs.getString("project_name"));
            m.put("projectNumber", rs.getString("project_number"));
            m.put("pendingCount", rs.getLong("pending"));
            m.put("breachedCount", rs.getLong("breached"));
            m.put("autoApprovedCount", rs.getLong("auto_approved"));
            m.put("reviewerApprovedCount", rs.getLong("reviewer_approved"));
            m.put("reworkCount", rs.getLong("rework"));
            Set<String> codes = new LinkedHashSet<>();
            java.sql.Array arr = rs.getArray("boundary_codes");
            if (arr != null) {
                for (Object o : (Object[]) arr.getArray()) {
                    if (o != null) {
                        codes.add(o.toString());
                    }
                }
            }
            codesByProject.put(id, codes);
            projects.add(m);
        }, q.params().toArray());
        addBoundaryNames(projects, codesByProject, requestInfo);
        Query countQ = build(c, cutoff, true);
        Long total = jdbc.queryForObject(countQ.sql(), Long.class, countQ.params().toArray());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ProjectSummaries", projects);
        out.put("TotalCount", total == null ? 0 : total);
        return out;
    }

    private void addBoundaryNames(List<Map<String, Object>> projects, Map<String, Set<String>> codesByProject, RequestInfo requestInfo) {
        Map<String, Boundary> byCode;
        try {
            byCode = boundaries.getBoundaryByCode();
        } catch (RuntimeException e) {
            byCode = null;
        }
        Map<String, Boundary> tree = byCode == null ? Map.of() : byCode;
        Set<String> all = new LinkedHashSet<>();
        codesByProject.values().forEach(cs -> cs.stream().map(tree::get).filter(Objects::nonNull)
                .forEach(b -> java.util.stream.Stream.of(b.getState(), b.getDistrict(), b.getBlock()).filter(Objects::nonNull).forEach(all::add)));
        Map<String, String> names;
        try {
            names = all.isEmpty() ? Map.of() : boundaryNames.localizeBoundaryCodes(all, requestInfo);
        } catch (RuntimeException e) {
            names = Map.of();
        }
        for (Map<String, Object> p : projects) {
            Set<String> states = new LinkedHashSet<>();
            Set<String> districts = new LinkedHashSet<>();
            Set<String> blocks = new LinkedHashSet<>();
            for (String code : codesByProject.getOrDefault((String) p.get("projectId"), Set.of())) {
                Boundary b = tree.get(code);
                if (b != null) {
                    addName(states, names, b.getState());
                    addName(districts, names, b.getDistrict());
                    addName(blocks, names, b.getBlock());
                }
            }
            p.put("states", new ArrayList<>(states));
            p.put("districts", new ArrayList<>(districts));
            p.put("blocks", new ArrayList<>(blocks));
        }
    }

    private void addName(Set<String> into, Map<String, String> names, String code) {
        if (code != null) {
            into.add(boundaryNames.localizedNameOrCode(names, code));
        }
    }
}
