package org.egov.amc.livelihood;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Component;

import java.sql.Array;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * G1 siteDetails for visit search ({@code includeSiteDetails=true}, LLD §6.9): one batched read per page from the
 * installation, asset and BOM rows, never one call per visit. systemType: the system type of the row's Solution, null when
 * it has none. It is per installation row, not per end user: an end user can have Solutions of different types.
 * batteryType: the BOM's system_battery_type (e.g. TUBULAR), else the BATTERY asset's batteryType.
 */
@Component
public class SiteDetailsReader {

    static final String ROWS_SQL = "SELECT fa.id, fa.completed_at, fa.facility_id, fa.field_plan_id, fad.pincode, t.system_type"
            + " FROM facility_activities fa LEFT JOIN facility f ON f.id = fa.facility_id LEFT JOIN facility_address fad ON fad.id = f.addressid"
            + " LEFT JOIN icc_templates t ON t.tenant_id = fa.tenant_id AND t.solution_code = fa.solution_id"
            + " WHERE fa.id = ANY (?)";
    static final String ASSETS_SQL = "SELECT activity_facility_id, asset_id, asset_type_id, parent_id, name, asset_details->>'batteryType' AS battery_type"
            + " FROM asset WHERE is_active AND activity_facility_id = ANY (?) ORDER BY asset_id";
    static final String BOM_SQL = "SELECT activity_facility_id, data->>'purchase_order_number' AS po, data->>'system_battery_type' AS battery"
            + " FROM bom WHERE is_active AND activity_facility_id = ANY (?)";
    /** Machines installed for the same end user in the same installation plan. */
    static final String MACHINES_SQL = "SELECT m.id, m.facility_id, m.field_plan_id, m.status, m.solution_id,"
            + " (SELECT string_agg(a.name, ', ') FROM asset a WHERE a.activity_facility_id = m.id AND a.is_active) AS names"
            + " FROM facility_activities m WHERE m.component_type = 'MACHINE' AND NOT coalesce(m.isdeleted, false) AND m.facility_id = ANY (?)"
            + " ORDER BY m.component_sequence";

    private final JdbcTemplate jdbc;

    public SiteDetailsReader(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** activityFacilityId -> siteDetails. */
    public Map<String, Map<String, Object>> read(Collection<String> activityFacilityIds) {
        Map<String, Map<String, Object>> out = new LinkedHashMap<>();
        List<String> ids = activityFacilityIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return out;
        }
        Map<String, String[]> rowFacilityPlan = new HashMap<>();
        query(ROWS_SQL, ids, rs -> {
            String id = rs.getString("id");
            long done = rs.getLong("completed_at");
            Map<String, Object> d = details(out, id);
            d.put("installationDate", done == 0 ? null : done);
            d.put("pinCode", blank(rs.getString("pincode")));
            d.put("systemType", blank(rs.getString("system_type")));
            rowFacilityPlan.put(id, new String[]{rs.getString("facility_id"), rs.getString("field_plan_id")});
        });
        Map<String, String> assetBattery = new HashMap<>();
        query(ASSETS_SQL, ids, rs -> {
            String row = rs.getString("activity_facility_id");
            Map<String, Object> d = details(out, row);
            String type = rs.getString("asset_type_id");
            if ("SOLAR".equals(type) && rs.getString("parent_id") == null) {
                d.put("solarAssetId", rs.getString("asset_id"));
            } else {
                components(d).add(Map.of("assetId", rs.getString("asset_id"), "assetType", type,
                        "name", rs.getString("name") == null ? type : rs.getString("name")));
            }
            if ("BATTERY".equals(type) && rs.getString("battery_type") != null) {
                assetBattery.put(row, rs.getString("battery_type"));
            }
        });
        Map<String, String> bomBattery = new HashMap<>();
        query(BOM_SQL, ids, rs -> {
            String row = rs.getString("activity_facility_id");
            details(out, row).put("purchaseOrderNumber", blank(rs.getString("po")));
            if (blank(rs.getString("battery")) != null) {
                bomBattery.put(row, rs.getString("battery"));
            }
        });
        List<String> facilities = rowFacilityPlan.values().stream().map(fp -> fp[0]).filter(java.util.Objects::nonNull).distinct().toList();
        Map<String, List<Map<String, Object>>> machinesByFacilityPlan = new HashMap<>();
        if (!facilities.isEmpty()) {
            query(MACHINES_SQL, facilities, rs -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("activityFacilityId", rs.getString("id"));
                m.put("solutionId", rs.getString("solution_id"));
                m.put("status", rs.getString("status"));
                m.put("name", rs.getString("names"));
                machinesByFacilityPlan.computeIfAbsent(rs.getString("facility_id") + "|" + rs.getString("field_plan_id"), k -> new ArrayList<>()).add(m);
            });
        }
        for (String id : ids) {
            Map<String, Object> d = details(out, id);
            d.put("activityFacilityId", id);
            d.putIfAbsent("solarAssetId", null);
            d.putIfAbsent("systemType", null);
            d.put("batteryType", bomBattery.getOrDefault(id, assetBattery.get(id)));
            components(d);
            String[] fp = rowFacilityPlan.get(id);
            d.put("machines", fp == null ? List.of() : machinesByFacilityPlan.getOrDefault(fp[0] + "|" + fp[1], List.of()));
            d.putIfAbsent("installationDate", null);
            d.putIfAbsent("pinCode", null);
            d.putIfAbsent("purchaseOrderNumber", null);
        }
        return out;
    }

    private void query(String sql, List<String> ids, RowCallbackHandler handler) {
        jdbc.query(con -> {
            var ps = con.prepareStatement(sql);
            Array arr = con.createArrayOf("varchar", ids.toArray());
            ps.setArray(1, arr);
            return ps;
        }, handler);
    }

    private static Map<String, Object> details(Map<String, Map<String, Object>> out, String id) {
        return out.computeIfAbsent(id, k -> new LinkedHashMap<>());
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> components(Map<String, Object> d) {
        return (List<Map<String, Object>>) d.computeIfAbsent("components", k -> new ArrayList<>());
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
