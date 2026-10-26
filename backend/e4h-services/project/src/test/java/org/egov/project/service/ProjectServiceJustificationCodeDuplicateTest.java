package org.egov.project.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.helper.RequestInfoTestBuilder;
import org.egov.common.models.project.Project;
import org.egov.common.models.project.ProjectRequest;
import org.egov.common.producer.Producer;
import org.egov.project.config.ProjectConfiguration;
import org.egov.project.repository.ProjectRepository;
import org.egov.project.service.enrichment.ProjectEnrichment;
import org.egov.project.util.ProjectServiceUtil;
import org.egov.project.validator.project.ProjectValidator;
import org.egov.project.web.models.ProjectNameResult;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the explicit duplicate-(justification code, financial year) check that replaced the
 * removed idgen/sequence mechanism — see {@code ProjectService#applyGeneratedProjectName}.
 */
@ExtendWith(MockitoExtension.class)
class ProjectServiceJustificationCodeDuplicateTest {

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectValidator projectValidator;
    @Mock
    private ProjectEnrichment projectEnrichment;
    @Mock
    private ProjectConfiguration projectConfiguration;
    @Mock
    private Producer producer;
    @Mock
    private ProjectServiceUtil projectServiceUtil;
    @Mock
    private ProjectWorkflowService workflowService;
    @Mock
    private ProjectFacilityService projectFacilityService;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ServiceRequestRepository serviceRequestRepository;
    @Mock
    private ProjectNameGenerationService projectNameGenerationService;

    private ProjectService projectService;
    private RequestInfo requestInfo;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(
                projectRepository, projectValidator, projectEnrichment, projectConfiguration,
                producer, projectServiceUtil, workflowService, projectFacilityService,
                jdbcTemplate, serviceRequestRepository, new ObjectMapper(), projectNameGenerationService);
        requestInfo = RequestInfoTestBuilder.builder().withCompleteRequestInfo().build();
    }

    private static Project project() {
        return Project.builder().id("project-1").tenantId("livelihood").build();
    }

    private void applyGeneratedProjectName(Project project, boolean draft) {
        ReflectionTestUtils.invokeMethod(projectService, "applyGeneratedProjectName", project, requestInfo, draft);
    }

    @Test
    void throwsDuplicateJustificationCodeWhenNameAlreadyExistsInDatabase() {
        Project project = project();
        when(projectNameGenerationService.generateProjectName(project, requestInfo, true))
                .thenReturn(ProjectNameResult.builder().name("JUS-98234-26-27").isDuplicateName(false).build());
        when(projectNameGenerationService.isNameInFlight("JUS-98234-26-27")).thenReturn(false);
        when(projectRepository.isProjectNameExistsExcludingProject("JUS-98234-26-27", "livelihood", "project-1"))
                .thenReturn(true);

        CustomException exception = assertThrows(CustomException.class, () -> applyGeneratedProjectName(project, true));

        assertEquals("DUPLICATE_JUSTIFICATION_CODE", exception.getCode());
        verify(projectNameGenerationService, never()).markNameInFlight(anyString());
    }

    @Test
    void throwsDuplicateJustificationCodeWhenNameAlreadyClaimedInSameBatch() {
        Project project = project();
        when(projectNameGenerationService.generateProjectName(project, requestInfo, true))
                .thenReturn(ProjectNameResult.builder().name("JUS-98234-26-27").isDuplicateName(false).build());
        when(projectNameGenerationService.isNameInFlight("JUS-98234-26-27")).thenReturn(true);

        CustomException exception = assertThrows(CustomException.class, () -> applyGeneratedProjectName(project, true));

        assertEquals("DUPLICATE_JUSTIFICATION_CODE", exception.getCode());
        verify(projectRepository, never()).isProjectNameExistsExcludingProject(anyString(), anyString(), anyString());
    }

    @Test
    void allowsCreationWhenNoCollisionAndMarksNameInFlight() {
        Project project = project();
        when(projectNameGenerationService.generateProjectName(project, requestInfo, true))
                .thenReturn(ProjectNameResult.builder().name("JUS-98234-27-28").isDuplicateName(false).build());
        when(projectNameGenerationService.isNameInFlight("JUS-98234-27-28")).thenReturn(false);
        when(projectRepository.isProjectNameExistsExcludingProject("JUS-98234-27-28", "livelihood", "project-1"))
                .thenReturn(false);

        applyGeneratedProjectName(project, true);

        assertEquals("JUS-98234-27-28", project.getName());
        verify(projectNameGenerationService).markNameInFlight("JUS-98234-27-28");
    }

    @Test
    void excludesTheProjectsOwnIdWhenCheckingForDuplicatesOnDraftUpdate() {
        Project project = project();
        when(projectNameGenerationService.generateProjectName(project, requestInfo, false))
                .thenReturn(ProjectNameResult.builder().name("JUS-98234-26-27").isDuplicateName(false).build());
        when(projectNameGenerationService.isNameInFlight("JUS-98234-26-27")).thenReturn(false);
        when(projectRepository.isProjectNameExistsExcludingProject(anyString(), anyString(), anyString()))
                .thenReturn(false);

        applyGeneratedProjectName(project, false);

        verify(projectRepository).isProjectNameExistsExcludingProject("JUS-98234-26-27", "livelihood", "project-1");
    }

    private ProjectRequest validateRequest(Project project) {
        return ProjectRequest.builder().requestInfo(requestInfo).projects(List.of(project)).build();
    }

    @Test
    void validateReturnsTheNameTheProjectWouldGetWhenTheCodeIsFree() {
        Project project = Project.builder().tenantId("livelihood").build();
        ProjectRequest request = validateRequest(project);
        when(projectNameGenerationService.generateProjectName(project, requestInfo, true))
                .thenReturn(ProjectNameResult.builder().name("JUS-98234-26-27").isDuplicateName(false).build());
        when(projectRepository.isProjectNameExists("JUS-98234-26-27", "livelihood")).thenReturn(false);

        Project validated = projectService.validateJustificationCode(request);

        verify(projectValidator).validateCreateProjectRequest(request);
        assertEquals("JUS-98234-26-27", validated.getName());
    }

    @Test
    void validateRejectsADuplicateJustificationCode() {
        Project project = Project.builder().tenantId("livelihood").build();
        ProjectRequest request = validateRequest(project);
        when(projectNameGenerationService.generateProjectName(project, requestInfo, true))
                .thenReturn(ProjectNameResult.builder().name("JUS-98234-26-27").isDuplicateName(false).build());
        when(projectRepository.isProjectNameExists("JUS-98234-26-27", "livelihood")).thenReturn(true);

        CustomException exception = assertThrows(CustomException.class,
                () -> projectService.validateJustificationCode(request));

        assertEquals("DUPLICATE_JUSTIFICATION_CODE", exception.getCode());
    }
}
