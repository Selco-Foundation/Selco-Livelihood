package org.egov.activity.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.activity.config.ActivityConfiguration;
import org.egov.common.contract.request.RequestInfo;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** AMC LLD §9: the approval hook's call to the AMC service's _activate. */
class AmcActivateCallTest {

    private final ActivityConfiguration config = ActivityConfiguration.builder()
            .amcSchedulerHost("http://amc-service:8080").amcActivateUrl("/asset-amc/v1/configuration/_activate").build();
    private final ServiceRequestRepository repo = mock(ServiceRequestRepository.class);
    private final AmcSchedulerService service = new AmcSchedulerService(config, repo, new ObjectMapper());

    @Test
    @SuppressWarnings("unchecked")
    void sendsTheRowAndTheApprovalTime() {
        RequestInfo ri = RequestInfo.builder().build();
        when(repo.fetchResult(any(StringBuilder.class), any())).thenReturn(Map.of("outcome", "ACTIVATED"));

        service.activateLivelihoodAmc("livelihood", "row-1", 1794823660566L, ri);

        ArgumentCaptor<StringBuilder> url = ArgumentCaptor.forClass(StringBuilder.class);
        ArgumentCaptor<Object> body = ArgumentCaptor.forClass(Object.class);
        verify(repo).fetchResult(url.capture(), body.capture());
        assertEquals("http://amc-service:8080/asset-amc/v1/configuration/_activate", url.getValue().toString());
        Map<String, Object> b = (Map<String, Object>) body.getValue();
        assertEquals("livelihood", b.get("tenantId"));
        assertEquals("row-1", b.get("activityFacilityId"));
        assertEquals(1794823660566L, b.get("approvedAt"), "the completedAt set by this approval (saved later through Kafka)");
        assertSame(ri, b.get("RequestInfo"));
    }

    @Test
    void anAmcFailureNeverFailsTheApproval() {
        when(repo.fetchResult(any(StringBuilder.class), any())).thenThrow(new RuntimeException("amc-service down"));
        assertDoesNotThrow(() -> service.activateLivelihoodAmc("livelihood", "row-1", 1L, RequestInfo.builder().build()));
    }
}
