package org.egov.field_planner.service;

import org.egov.field_planner.repository.GeographyLockRepository;
import org.egov.field_planner.repository.GeographyLockRepository.PlanGeography;
import org.egov.field_planner.web.models.GeographyLock;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GeographyLockServiceTest {

    private final GeographyLockRepository repository = mock(GeographyLockRepository.class);
    private final GeographyLockService service = new GeographyLockService(repository);

    private static PlanGeography plan(List<String> sectors) {
        return new PlanGeography("plan-1", "IN-INS-2026-1", Map.of(), sectors);
    }

    @Test
    void locksOnlyTheSectorsThatHoldAScopedSite() {
        when(repository.findScopedSiteSectors("plan-1"))
                .thenReturn(List.of("agriculture ", "Agriculture", "Textile & craft"));

        List<GeographyLock> locks = service.planSectorLocks(plan(List.of("Agriculture", "Textile & craft", "Animal Husbandary")));

        assertEquals(2, locks.size());
        assertEquals("Agriculture", locks.get(0).getCode());
        assertEquals(2, locks.get(0).getUsedBy().get(0).getSiteCount());
        assertEquals("Textile & craft", locks.get(1).getCode());
        assertEquals(1, locks.get(1).getUsedBy().get(0).getSiteCount());
    }

    @Test
    void locksNothingWhenThePlanHasNoScopedSites() {
        when(repository.findScopedSiteSectors("plan-1")).thenReturn(List.of());

        assertTrue(service.planSectorLocks(plan(List.of("Agriculture"))).isEmpty());
    }

    @Test
    void locksNothingWhenThePlanHasNoSectors() {
        when(repository.findScopedSiteSectors("plan-1")).thenReturn(List.of("Agriculture"));

        assertTrue(service.planSectorLocks(plan(null)).isEmpty());
    }

    @Test
    void comparesSectorsTrimmedAndCaseInsensitive() {
        assertEquals(GeographyLockService.sectorKey(" Agriculture"), GeographyLockService.sectorKey("AGRICULTURE "));
    }
}
