package org.egov.im.service;

import org.egov.common.contract.request.RequestInfo;
import org.egov.im.repository.IMRepository;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.RequestSearchCriteria;
import org.egov.im.web.models.User;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.egov.im.util.IMConstants.ENTRY_CHANNEL_DIRECT;
import static org.egov.im.util.IMConstants.ENTRY_CHANNEL_IVR_WHATSAPP;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class LivelihoodCreateServiceDuplicateTest {

    private static final String TENANT = "ka";
    private static final String END_USER = "11111111-1111-1111-1111-111111111111";
    private static final String ASSET = "AST-001";
    private static final String ISSUE = "PUMP_NOT_WORKING";

    @Mock
    private IMRepository imRepository;

    @InjectMocks
    private LivelihoodCreateService service;

    private IncidentRequest request;

    @BeforeEach
    public void setUp() {
        Incident incident = new Incident();
        incident.setTenantId(TENANT);
        incident.setAssetId(ASSET);
        incident.setIncidentType(ISSUE);
        incident.setEntryChannel(ENTRY_CHANNEL_DIRECT);
        incident.setReporter(User.builder().uuid(END_USER).build());
        request = new IncidentRequest();
        request.setIncident(incident);
        request.setRequestInfo(new RequestInfo());
    }

    @Test
    public void allowsCreateWhenNoActiveTicket() {
        when(imRepository.getIncidents(any())).thenReturn(Collections.emptyList());

        service.rejectDuplicate(request);

        RequestSearchCriteria criteria = capturedCriteria();
        assertEquals(Set.of(END_USER), criteria.getUserIds());
        assertEquals(Set.of(ASSET), criteria.getAssetIds());
        assertEquals(Set.of(ISSUE), criteria.getIncidentType());
        assertEquals(TENANT, criteria.getTenantId());
    }

    @Test
    public void onlyActiveStatusesAreConsidered() {
        when(imRepository.getIncidents(any())).thenReturn(Collections.emptyList());

        service.rejectDuplicate(request);

        Set<String> statuses = capturedCriteria().getApplicationStatus();
        assertTrue(statuses.contains("PENDING_FOR_RESOLUTION"));
        assertTrue(statuses.contains("OUT_OF_SCOPE_PENDING_POC"));
        assertTrue(statuses.contains("OUT_OF_SCOPE_PENDING_VENDOR"));
        assertTrue(statuses.contains("OUT_OF_WARRANTY_PENDING_VENDOR"));
        assertFalse(statuses.contains("RESOLVED"), "resolved issues may be raised again");
        assertFalse(statuses.contains("CLOSED_AFTER_RESOLUTION"));
        assertFalse(statuses.contains("CLOSED_AFTER_DECLINE"));
    }

    @Test
    public void blocksWebDuplicateWithExistingTicketNumber() {
        when(imRepository.getIncidents(any())).thenReturn(List.of(existing("LH-2026-11-000123", "PENDING_FOR_RESOLUTION")));

        try {
            service.rejectDuplicate(request);
            fail("expected duplicate to be rejected");
        } catch (CustomException e) {
            assertEquals(LivelihoodCreateService.DUPLICATE_TICKET_CODE, e.getCode());
            assertEquals(LivelihoodCreateService.DUPLICATE_TICKET_MESSAGE + "LH-2026-11-000123", e.getMessage());
        }
    }

    @Test
    public void blocksIvrDuplicateAndReportsStatus() {
        request.getIncident().setEntryChannel(ENTRY_CHANNEL_IVR_WHATSAPP);
        request.getIncident().setAccountId(END_USER);
        when(imRepository.getIncidents(any())).thenReturn(List.of(existing("LH-2026-11-000124", "OUT_OF_SCOPE_PENDING_POC")));

        try {
            service.rejectDuplicate(request);
            fail("expected duplicate to be rejected");
        } catch (CustomException e) {
            assertEquals(LivelihoodCreateService.IVR_DUPLICATE_TICKET_CODE, e.getCode());
            assertTrue(e.getMessage().contains("LH-2026-11-000124"));
            assertTrue(e.getMessage().contains("OUT_OF_SCOPE_PENDING_POC"));
        }
    }

    @Test
    public void pocOnBehalfUsesResolvedEndUserNotPoc() {
        request.getIncident().setAccountId(END_USER);
        request.getIncident().setReporter(User.builder().uuid("poc-or-other").build());
        when(imRepository.getIncidents(any())).thenReturn(Collections.emptyList());

        service.rejectDuplicate(request);

        assertEquals(Set.of(END_USER), capturedCriteria().getUserIds());
    }

    private RequestSearchCriteria capturedCriteria() {
        ArgumentCaptor<RequestSearchCriteria> captor = ArgumentCaptor.forClass(RequestSearchCriteria.class);
        verify(imRepository).getIncidents(captor.capture());
        return captor.getValue();
    }

    private static Incident existing(String incidentId, String status) {
        Incident incident = new Incident();
        incident.setIncidentId(incidentId);
        incident.setApplicationStatus(status);
        return incident;
    }
}
