package org.egov.project.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.helper.RequestInfoTestBuilder;
import org.egov.common.models.project.Project;
import org.egov.project.util.MDMSUtils;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectNameGenerationServiceTest {

    @Mock
    private MDMSUtils mdmsUtils;

    private ProjectNameGenerationService service;
    private RequestInfo requestInfo;

    @BeforeEach
    void setUp() {
        service = new ProjectNameGenerationService(new ObjectMapper(), mdmsUtils);
        requestInfo = RequestInfoTestBuilder.builder().withCompleteRequestInfo().build();
    }

    private static long epochMillis(int year, int month, int day) {
        return ZonedDateTime.of(year, month, day, 0, 0, 0, 0, ZoneId.systemDefault()).toInstant().toEpochMilli();
    }

    private static Project projectWithJustificationCode(String justificationCode) {
        return Project.builder()
                .id("project-1")
                .tenantId("livelihood")
                .startDate(epochMillis(2026, 4, 1))
                .endDate(epochMillis(2027, 3, 31))
                .additionalDetails(Map.of("justificationCode", justificationCode))
                .build();
    }

    private String nameFor(String justificationCode) {
        when(mdmsUtils.getJustificationCodePrefix(any(RequestInfo.class), eq("livelihood"))).thenReturn("JUS");
        return service.generateProjectName(projectWithJustificationCode(justificationCode), requestInfo, true).getName();
    }

    @Test
    void acceptsValidJustificationCodeFormats() {
        for (String code : Arrays.asList("98234", "98234-1", "98234-01", "98234-10")) {
            assertTrue(service.isValidJustificationCodeFormat(code), "expected valid: " + code);
        }
    }

    @Test
    void rejectsInvalidJustificationCodeFormats() {
        for (String code : Arrays.asList("98234-100", "ABCDE", "9823", "982345", "98234-", "98234-a", "98234 1")) {
            assertFalse(service.isValidJustificationCodeFormat(code), "expected invalid: " + code);
        }
    }

    @Test
    void buildsNameFromTheMdmsPrefixWithoutSequenceSegment() {
        assertEquals("JUS-98234-26-27", nameFor("98234"));
    }

    @Test
    void keepsTheVersionSuffixAsTyped() {
        assertEquals("JUS-98234-1-26-27", nameFor("98234-1"));
        assertEquals("JUS-98234-01-26-27", nameFor("98234-01"));
    }

    @Test
    void stillNamesProjectsWithCodesStoredBeforeTheFormatChange() {
        assertEquals("JUS-SLKA-26-27", nameFor("SLKA"));
    }

    @Test
    void rejectsCodesThatFitNeitherFormatBeforeCallingMdms() {
        Project project = projectWithJustificationCode("98234-100");

        CustomException exception = assertThrows(CustomException.class,
                () -> service.generateProjectName(project, requestInfo, true));

        assertEquals("INVALID_JUSTIFICATION_CODE", exception.getCode());
        verifyNoInteractions(mdmsUtils);
    }

    @Test
    void recognizesBothCurrentAndLegacyNames() {
        assertTrue(service.isRevisedProjectIdFormat("JUS-98234-26-26"));
        assertTrue(service.isRevisedProjectIdFormat("JUS-98234-1-26-26"));
        assertTrue(service.isRevisedProjectIdFormat("JUS-98234-01-26-26"));
        assertTrue(service.isRevisedProjectIdFormat("PROJ-SLKA-26-27-001"));
        assertFalse(service.isRevisedProjectIdFormat("KA-2627-190-00120-1"));
    }
}
