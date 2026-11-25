package org.egov.amc.livelihood;

import org.egov.amc.web.models.User;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProjectSummaryAndConfigEnrichTest {

    @Test
    void summaryCountsTheFiveReviewerStatesFromOneQuery() {
        ProjectSummaryService.Query q = ProjectSummaryService.build(
                new ProjectSummaryService.Criteria("livelihood", null, null, null, null, null, null, null), 111L, false);
        String s = q.sql();
        assertTrue(s.contains("COUNT(*) FILTER (WHERE sv.status = 'PENDING_APPROVAL') AS pending"));
        assertTrue(s.contains("sv.latest_submission_date < ?) AS breached"));
        assertTrue(s.contains("sv.approved_by = 'SYSTEM') AS auto_approved"));
        assertTrue(s.contains("sv.approved_by = 'REVIEWER') AS reviewer_approved"));
        assertTrue(s.contains("sv.status = 'REJECTED') AS rework"));
        assertTrue(s.contains("sv.is_active") && !s.contains("ac.is_active"), "a turned-off AMC's pending reviews still count");
        assertTrue(s.contains("GROUP BY sv.project_id"));
        assertEquals(List.of(111L, "livelihood", 10, 0), q.params(), "cutoff, tenant, default page");
    }

    @Test
    void summaryFiltersAndPaging() {
        ProjectSummaryService.Query q = ProjectSummaryService.build(new ProjectSummaryService.Criteria("livelihood", List.of("p1", "p2"),
                "jus", List.of("INDIA_ASSAM"), null, List.of("INDIA_ASSAM_BAKSA_DHAMDHAMA", "INDIA_ASSAM_BAKSA_X"), 20, 500), 5L, false);
        assertTrue(q.sql().contains("sv.project_id = ANY (?)"));
        assertTrue(q.sql().contains("p.name ILIKE ?"));
        assertTrue(q.sql().contains("(starts_with(f.boundary_code, ?))"));
        assertTrue(q.sql().contains("(starts_with(f.boundary_code, ?) OR starts_with(f.boundary_code, ?))"));
        List<Object> p = q.params();
        assertArrayEquals(new String[]{"p1", "p2"}, (String[]) p.get(2));
        assertEquals("%jus%", p.get(3));
        assertEquals("INDIA_ASSAM_", p.get(4), "prefix match on the facility boundary code");
        assertEquals(100, p.get(p.size() - 2), "limit capped at 100");
        assertEquals(20, p.get(p.size() - 1));

        ProjectSummaryService.Query count = ProjectSummaryService.build(new ProjectSummaryService.Criteria("livelihood", null, "jus", null, null, null, 0, 10), 5L, true);
        assertTrue(count.sql().startsWith("SELECT count(DISTINCT sv.project_id)"));
        assertEquals(List.of("livelihood", "%jus%"), count.params());
    }

    @Test
    void configFieldStaffShape() {
        Map<String, Object> fs = ConfigSearchEnricher.fieldStaff("fs-1",
                Map.of("fs-1", User.builder().name("AMC Field Staff").mobileNumber("1000000917").build()));
        assertEquals(Map.of("uuid", "fs-1", "name", "AMC Field Staff", "mobile", "1000000917"), fs);
        Map<String, Object> unknown = ConfigSearchEnricher.fieldStaff("fs-9", Map.of());
        assertEquals("fs-9", unknown.get("uuid"));
        assertNull(unknown.get("name"));
        assertNull(ConfigSearchEnricher.fieldStaff(null, Map.of()));
    }
}
