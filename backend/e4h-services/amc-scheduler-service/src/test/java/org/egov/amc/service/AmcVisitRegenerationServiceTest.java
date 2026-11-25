package org.egov.amc.service;

import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.repository.ScheduledVisitRepository;
import org.egov.amc.util.AmcConfigurationServiceUtil;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.common.producer.Producer;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class AmcVisitRegenerationServiceTest {

    private final ScheduledVisitRepository repository = mock(ScheduledVisitRepository.class);
    private final AmcConfigurationServiceUtil util = mock(AmcConfigurationServiceUtil.class);
    private final AMCServiceConfiguration config = mock(AMCServiceConfiguration.class);
    private final Producer producer = mock(Producer.class);
    private final AmcVisitRegenerationService service =
            new AmcVisitRegenerationService(repository, util, config, producer);

    private static AmcConfiguration config(int duration, int frequency, long start) {
        return AmcConfiguration.builder()
                .id("amc-1").tenantId("livelihood")
                .durationMonths(duration).visitFrequencyMonths(frequency)
                .configurationStartDate(start).configurationEndDate(start + 1000L)
                .build();
    }

    /** E4H bug: the "unchanged" guard did `List.of();` without return, so visits were rebuilt anyway. */
    @Test
    void unchangedScheduleLeavesVisitsAlone() {
        AmcConfiguration fromDb = config(12, 6, 1_700_000_000_000L);
        AmcConfiguration updated = config(12, 6, 1_700_000_000_000L);

        List<ScheduledVisit> result = service.regenerateIfCadenceChanged(fromDb, updated, null);

        assertTrue(result.isEmpty());
        verifyNoInteractions(repository, producer);
    }

    @Test
    void missingConfigurationIsANoOp() {
        assertTrue(service.regenerateIfCadenceChanged(null, config(12, 6, 1L), null).isEmpty());
        assertTrue(service.regenerateIfCadenceChanged(config(12, 6, 1L), null, null).isEmpty());
        verifyNoInteractions(repository, producer);
    }
}
