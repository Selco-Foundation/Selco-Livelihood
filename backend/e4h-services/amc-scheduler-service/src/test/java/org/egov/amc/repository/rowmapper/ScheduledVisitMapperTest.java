package org.egov.amc.repository.rowmapper;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.web.models.ScheduledVisit;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ScheduledVisitMapperTest {

    /** A ResultSet backed by a map: missing or null columns read as SQL NULL, as JDBC does. */
    private static ResultSet resultSet(Map<String, Object> row) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        boolean[] lastWasNull = {false};
        when(rs.getString(anyString())).thenAnswer(i -> {
            Object v = row.get(i.<String>getArgument(0));
            lastWasNull[0] = v == null;
            return v == null ? null : v.toString();
        });
        when(rs.getLong(anyString())).thenAnswer(i -> {
            Object v = row.get(i.<String>getArgument(0));
            lastWasNull[0] = v == null;
            return v == null ? 0L : ((Number) v).longValue();
        });
        when(rs.getInt(anyString())).thenAnswer(i -> {
            Object v = row.get(i.<String>getArgument(0));
            lastWasNull[0] = v == null;
            return v == null ? 0 : ((Number) v).intValue();
        });
        when(rs.getBoolean(anyString())).thenAnswer(i -> {
            Object v = row.get(i.<String>getArgument(0));
            lastWasNull[0] = v == null;
            return v != null && (Boolean) v;
        });
        when(rs.getObject(anyString())).thenAnswer(i -> row.get(i.<String>getArgument(0)));
        when(rs.wasNull()).thenAnswer(i -> lastWasNull[0]);
        return rs;
    }

    private static ScheduledVisitMapper mapper() {
        ScheduledVisitMapper mapper = new ScheduledVisitMapper();
        ReflectionTestUtils.setField(mapper, "objectMapper", new ObjectMapper());
        return mapper;
    }

    private static Map<String, Object> baseRow() {
        Map<String, Object> row = new HashMap<>();
        row.put("sv_visit_id", "v1");
        row.put("sv_tenant_id", "livelihood");
        row.put("sv_visit_number", 1);
        row.put("sv_scheduled_date", 100L);
        row.put("sv_status", "SCHEDULED");
        row.put("sv_is_active", true);
        row.put("assignments", "[]");
        return row;
    }

    /** Review A4: E4H never read sv.additional_details, so every visit update wiped it. */
    @Test
    void readsAdditionalDetailsAndLivelihoodColumns() throws Exception {
        Map<String, Object> row = baseRow();
        row.put("sv_additional_details", "{\"reportPdf\":{\"fileStoreId\":\"fs-1\"},\"systemStatus\":{\"isSystemFunctional\":false}}");
        row.put("sv_vendor_id", "org-1");
        row.put("sv_first_submission_date", 91L);
        row.put("sv_latest_submission_date", 95L);
        row.put("sv_approved_by", "REVIEWER");
        row.put("sv_last_scheduled_visit_date", 50L);

        ScheduledVisit visit = mapper().mapRow(resultSet(row), 0);

        assertEquals("fs-1", ((Map<?, ?>) visit.getAdditionalDetails().get("reportPdf")).get("fileStoreId"));
        assertEquals(false, ((Map<?, ?>) visit.getAdditionalDetails().get("systemStatus")).get("isSystemFunctional"));
        assertEquals("org-1", visit.getVendorId());
        assertEquals(91L, visit.getFirstSubmissionDate());
        assertEquals(95L, visit.getLatestSubmissionDate());
        assertEquals("REVIEWER", visit.getApprovedBy());
        assertEquals(50L, visit.getLastVisitDate());
    }

    /** Review A14: a NULL date must stay null, not become 0 (which an update would then write back). */
    @Test
    void nullColumnsStayNull() throws Exception {
        ScheduledVisit visit = mapper().mapRow(resultSet(baseRow()), 0);

        assertNull(visit.getAdditionalDetails());
        assertNull(visit.getVendorId());
        assertNull(visit.getFirstSubmissionDate());
        assertNull(visit.getLatestSubmissionDate());
        assertNull(visit.getApprovedBy());
        assertNull(visit.getLastVisitDate());
        assertNull(visit.getActualVisitDate());
    }
}
