package org.egov.amc.util;

import org.egov.amc.web.models.Boundary;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class BoundaryUtilTest {

    /**
     * Livelihood end users sit as Facility nodes under a Block in hierarchy SELCO (checked on dev
     * 2026-11-16, e.g. INDIA_KARNATAKA_KOPPAL_GANGAVATHI_ED/2026/0027), the same shape E4H expects.
     */
    @Test
    void mapsLivelihoodEndUserToStateDistrictBlock() throws Exception {
        String json = "{\"TenantBoundary\":[{\"hierarchyType\":\"SELCO\",\"boundary\":[{"
                + "\"code\":\"INDIA_KARNATAKA\",\"boundaryType\":\"State\",\"children\":[{"
                + "\"code\":\"INDIA_KARNATAKA_KOPPAL\",\"boundaryType\":\"District\",\"children\":[{"
                + "\"code\":\"INDIA_KARNATAKA_KOPPAL_GANGAVATHI\",\"boundaryType\":\"Block\",\"children\":[{"
                + "\"code\":\"INDIA_KARNATAKA_KOPPAL_GANGAVATHI_ED/2026/0027\",\"boundaryType\":\"Facility\",\"children\":[]"
                + "}]}]}]}]}]}";

        Map<String, Boundary> map = BoundaryUtil.extractBlockToDistrictMapping(json);

        Boundary b = map.get("INDIA_KARNATAKA_KOPPAL_GANGAVATHI_ED/2026/0027");
        assertNotNull(b);
        assertEquals("INDIA_KARNATAKA", b.getState());
        assertEquals("INDIA_KARNATAKA_KOPPAL", b.getDistrict());
        assertEquals("INDIA_KARNATAKA_KOPPAL_GANGAVATHI", b.getBlock());
    }
}
