package facility.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BoundaryUtilTest {

    private final BoundaryUtil boundaryUtil = new BoundaryUtil();

    @Test
    void facilityCodesAreFacilityLevel() {
        assertTrue(boundaryUtil.isFacilityLevelBoundaryCode("India_Assam_Kamrup_Amingaon_FAC/2025/0045"));
        assertTrue(boundaryUtil.isFacilityLevelBoundaryCode("INDIA_ODISHA_DHENKANAL_DHENKANAL/SADAR_ED/2026/0013"));
        assertTrue(boundaryUtil.isFacilityLevelBoundaryCode("INDIA_KARNATAKA_MYSURU_HUNSUR_fac/2026/0013"));
    }

    @Test
    void blockCodesWithSlashInNameAreNotFacilityLevel() {
        assertFalse(boundaryUtil.isFacilityLevelBoundaryCode("INDIA_ODISHA_DHENKANAL_DHENKANAL/SADAR"));
        assertFalse(boundaryUtil.isFacilityLevelBoundaryCode("INDIA_ANDAMAN/AND/NICOBAR/ISLANDS_NORTH/AND/MIDDLE/ANDAMAN_DIGLIPUR"));
        assertFalse(boundaryUtil.isFacilityLevelBoundaryCode("INDIA_KARNATAKA_MYSURU_HUNSUR"));
        assertFalse(boundaryUtil.isFacilityLevelBoundaryCode(null));
    }
}
