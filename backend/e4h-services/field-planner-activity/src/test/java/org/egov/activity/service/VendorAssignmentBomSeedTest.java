package org.egov.activity.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.activity.config.ActivityConfiguration;
import org.egov.common.producer.Producer;
import org.egov.activity.repository.VendorAssignmentRepository;
import org.egov.activity.util.MDMSUtils;
import org.egov.activity.util.VendorDirectory;
import org.egov.activity.web.models.VendorAssignmentSubmission;
import org.egov.common.service.IdGenService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;

/** What vendor assignment puts in each asset's bom.data. */
class VendorAssignmentBomSeedTest {

    private final VendorAssignmentService service = new VendorAssignmentService(
            new VendorAssignmentRepository(mock(JdbcTemplate.class), new ObjectMapper()), mock(Producer.class),
            mock(IdGenService.class), new ActivityConfiguration(), mock(VendorDirectory.class),
            mock(FacilityWorkflowService.class), mock(MDMSUtils.class));

    private static Map<String, Object> template(Object systemType) {
        Map<String, Object> fields = new HashMap<>(Map.of("bom_solar_panel_make", "X", "machine_1_make", "M1",
                "machine_2_make", "M2", "tender_number", "T", "purchase_order_number", "PO"));
        if (systemType != null) {
            fields.put("system_type", systemType);
        }
        return Map.of("fields", fields, "machineSection", List.of(
                Map.of("fieldNames", Map.of("make", "machine_1_make")), Map.of("fieldNames", Map.of("make", "machine_2_make"))));
    }

    private Map<String, Object> seed(String type, int sequence, Object systemType) {
        VendorAssignmentSubmission submission = new VendorAssignmentSubmission();
        submission.setComponentType(type);
        submission.setComponentSequence(sequence);
        return service.seedBomData(submission, template(systemType), "IC/1", Map.of());
    }

    @Test
    void everyAssetCarriesTheSystemType() {
        assertEquals("DC", seed("SOLAR", 1, "DC").get("system_type"));
        assertEquals("DC", seed("MACHINE", 1, "DC").get("system_type"));
        assertEquals("DC", seed("MACHINE", 2, "DC").get("system_type"));
        assertEquals("DC", seed("MACHINE", 9, "DC").get("system_type"), "out of range: header fields only");
    }

    @Test
    void blankWhenTheTemplateHasNone() {
        assertEquals("", seed("SOLAR", 1, null).get("system_type"), "a template saved before the field existed");
        assertEquals("", seed("MACHINE", 1, null).get("system_type"));
        assertEquals("", seed("SOLAR", 1, "").get("system_type"));
    }

    @Test
    void theRestIsUnchanged() {
        Map<String, Object> solar = seed("SOLAR", 1, "AC");
        assertEquals(Map.of("bom_solar_panel_make", "X", "tender_number", "T", "purchase_order_number", "PO",
                "report_number", "IC/1", "system_type", "AC"), solar);
        Map<String, Object> machine = seed("MACHINE", 2, "AC");
        assertEquals("M2", machine.get("machine_2_make"));
        assertFalse(machine.containsKey("machine_1_make"));
    }
}
