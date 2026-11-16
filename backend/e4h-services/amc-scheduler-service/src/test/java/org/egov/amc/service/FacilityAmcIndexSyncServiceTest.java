package org.egov.amc.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.repository.AmcConfigurationRepository;
import org.egov.amc.repository.ScheduledVisitRepository;
import org.egov.amc.util.FacilitySystemTypeUtil;
import org.egov.amc.util.MappedVendorUtil;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class FacilityAmcIndexSyncServiceTest {

    /** Livelihood has no facility _update-amc-index endpoint: with the switch off nothing is called. */
    @Test
    void switchedOffSyncCallsNothing() {
        AMCServiceConfiguration config = mock(AMCServiceConfiguration.class);
        when(config.isFacilityIndexSyncEnabled()).thenReturn(false);
        AmcConfigurationRepository configRepo = mock(AmcConfigurationRepository.class);
        ScheduledVisitRepository visitRepo = mock(ScheduledVisitRepository.class);
        ServiceRequestRepository requests = mock(ServiceRequestRepository.class);
        MappedVendorUtil mappedVendor = mock(MappedVendorUtil.class);
        FacilitySystemTypeUtil systemType = mock(FacilitySystemTypeUtil.class);
        ActualVisitDateEnricher enricher = mock(ActualVisitDateEnricher.class);
        FacilityAmcIndexSyncService service = new FacilityAmcIndexSyncService(config, configRepo, visitRepo,
                requests, mappedVendor, systemType, enricher, new ObjectMapper());

        service.syncFacilityAmcSnapshot("ED/2026/0027", "livelihood", null);
        service.syncFacilityAmcSnapshot("ED/2026/0027", "livelihood", null, List.of());

        verifyNoInteractions(configRepo, visitRepo, requests, mappedVendor, systemType, enricher);
    }
}
