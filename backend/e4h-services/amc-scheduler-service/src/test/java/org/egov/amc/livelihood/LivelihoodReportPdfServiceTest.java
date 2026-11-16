package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.repository.AmcConfigurationRepository;
import org.egov.amc.service.ServiceRequestRepository;
import org.egov.amc.util.BoundaryLocalizationUtil;
import org.egov.amc.util.BoundaryUtil;
import org.egov.amc.validator.AmcConfigurationValidator;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LivelihoodReportPdfServiceTest {

    AMCServiceConfiguration config = mock(AMCServiceConfiguration.class);
    ServiceRequestRepository http = mock(ServiceRequestRepository.class);
    AmcConfigurationRepository configs = mock(AmcConfigurationRepository.class);
    VendorOrgDirectory vendors = mock(VendorOrgDirectory.class);
    AmcConfigurationValidator projects = mock(AmcConfigurationValidator.class);
    BoundaryUtil boundaries = mock(BoundaryUtil.class);
    BoundaryLocalizationUtil names = mock(BoundaryLocalizationUtil.class);
    LivelihoodReportPdfService service;
    RequestInfo ri = RequestInfo.builder().build();
    LivelihoodReportPdfData.Step step = LivelihoodReportPdfDataTest.submit();

    @BeforeEach
    void setUp() {
        when(config.isAmcPdfEnabled()).thenReturn(true);
        when(config.getAmcPdfKey()).thenReturn("amc-report");
        when(config.getPdfServiceHost()).thenReturn("http://pdf-service.core:8080");
        when(config.getPdfServiceCreateUrl()).thenReturn("/pdf-service/v1/_create");
        when(configs.getAmcConfiguration(any(), anyInt(), anyInt(), anyString(), any(), any()))
                .thenReturn(List.of(AmcConfiguration.builder().id("cfg").vendorId("org-1").durationMonths(12).visitFrequencyMonths(6).build()));
        when(vendors.findOrgs(any(), anyString(), any())).thenReturn(Map.of("org-1", new VendorOrgDirectory.VendorOrg("org-1", "VENDOR", true, "KhushVendor")));
        service = new LivelihoodReportPdfService(config, http, configs, vendors, projects, boundaries, names, new ObjectMapper());
    }

    ScheduledVisit visit() {
        return ScheduledVisit.builder().id("v1").tenantId("livelihood").amcConfigurationId("cfg").visitNumber(1).build();
    }

    @Test
    @SuppressWarnings("unchecked")
    void returnsTheFileAndSendsTheKeyAndData() {
        when(http.fetchResult(any(), any())).thenReturn(Map.of("filestoreIds", List.of("fs-1")));

        assertEquals("fs-1", service.generate(ri, visit(), LivelihoodReportPdfDataTest.report(), null, "FS", step));

        ArgumentCaptor<StringBuilder> url = ArgumentCaptor.forClass(StringBuilder.class);
        ArgumentCaptor<Object> body = ArgumentCaptor.forClass(Object.class);
        verify(http).fetchResult(url.capture(), body.capture());
        assertEquals("http://pdf-service.core:8080/pdf-service/v1/_create?key=amc-report&tenantId=livelihood", url.getValue().toString());
        Map<String, Object> amc = (Map<String, Object>) ((Map<String, Object>) body.getValue()).get("amc");
        assertEquals("KhushVendor", amc.get("vendor_name"));
        assertEquals("1 of 2", amc.get("amc_number"));
        // turned-off AMCs are included in the configuration look-up
        verify(configs).getAmcConfiguration(any(), eq(1), eq(0), eq("livelihood"), eq(true), any());
    }

    @Test
    void noFileBackIsAPdfFailure() {
        when(http.fetchResult(any(), any())).thenReturn(Map.of("filestoreIds", List.of()));
        CustomException e = assertThrows(CustomException.class,
                () -> service.generate(ri, visit(), LivelihoodReportPdfDataTest.report(), null, "FS", step));
        assertEquals("AMC_PDF_GENERATION_FAILED", e.getCode());
    }

    @Test
    void pdfServiceErrorIsAPdfFailure() {
        when(http.fetchResult(any(), any())).thenThrow(new RuntimeException("connection refused"));
        CustomException e = assertThrows(CustomException.class,
                () -> service.generate(ri, visit(), LivelihoodReportPdfDataTest.report(), null, "FS", step));
        assertEquals("AMC_PDF_GENERATION_FAILED", e.getCode());
    }

    @Test
    void failedNameLookUpsDoNotFailThePdf() {
        when(vendors.findOrgs(any(), anyString(), any())).thenThrow(new RuntimeException("vendor-registry down"));
        when(http.fetchResult(any(), any())).thenReturn(Map.of("filestoreIds", List.of("fs-2")));
        assertEquals("fs-2", service.generate(ri, visit(), LivelihoodReportPdfDataTest.report(), null, "FS", step));
    }

    @Test
    void switchedOffMakesNoPdf() {
        when(config.isAmcPdfEnabled()).thenReturn(false);
        assertNull(service.generate(ri, visit(), LivelihoodReportPdfDataTest.report(), null, "FS", step));
        verifyNoInteractions(http);
    }
}
