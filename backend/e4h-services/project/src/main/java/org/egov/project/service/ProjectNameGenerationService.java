package org.egov.project.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.models.project.Project;
import org.egov.project.repository.ProjectRepository;
import org.egov.project.web.models.ProjectNameResult;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Project name format: PROJ-&lt;JustificationCode&gt;-&lt;FinancialYear&gt;-&lt;SequenceNumber&gt;
 * Example: PROJ-12345-26-27-001
 * The sequence number auto-increments and resets per unique combination of
 * justification code and financial year.
 */
@Service
@Slf4j
public class ProjectNameGenerationService {

    private static final Pattern PROJECT_NAME_PATTERN =
            Pattern.compile("^PROJ-([A-Z0-9]+)-(\\d{2})-(\\d{2})-(\\d{3})$", Pattern.CASE_INSENSITIVE);
    private static final Pattern JUSTIFICATION_CODE_PATTERN =
            Pattern.compile("^[A-Za-z0-9]+$");
    private static final String NAME_PREFIX = "PROJ";
    private static final String SCHEDULED_STATUS = "SCHEDULED";
    public static final String JUSTIFICATION_CODE_MESSAGE =
            "Justification code is required and must be alphanumeric (letters and digits only).";

    private static final ThreadLocal<Map<String, Integer>> IN_FLIGHT_SEQUENCES = new ThreadLocal<>();

    private final ProjectRepository projectRepository;
    private final ObjectMapper objectMapper;

    public ProjectNameGenerationService(
            ProjectRepository projectRepository,
            @Qualifier("objectMapper") ObjectMapper objectMapper) {
        this.projectRepository = projectRepository;
        this.objectMapper = objectMapper;
    }

    public static String getScheduledStatus() {
        return SCHEDULED_STATUS;
    }

    /**
     * Opens a name-generation batch so that multiple projects generated within the same
     * request (e.g. a create request with several projects sharing the same justification
     * code and financial year) reserve distinct sequence numbers instead of racing against
     * the database, which is only updated once the batch is persisted asynchronously.
     */
    public void beginNameGenerationBatch() {
        IN_FLIGHT_SEQUENCES.set(new HashMap<>());
    }

    public void endNameGenerationBatch() {
        IN_FLIGHT_SEQUENCES.remove();
    }

    public ProjectNameResult generateProjectName(Project project, RequestInfo requestInfo, boolean draft) {
        return generateProjectName(project, requestInfo, draft, null);
    }

    public ProjectNameResult generateProjectName(Project project, RequestInfo requestInfo, boolean draft,
                                               Integer facilityCountOverride) {
        log.info("Generating project name for project: {}", project.getId());
        try {
            String name = buildProjectName(project);
            log.info("Generated project name: {}", name);
            return ProjectNameResult.builder()
                    .name(name)
                    .isDuplicateName(false)
                    .build();
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error generating project name for project: {}", project.getId(), e);
            throw new CustomException("PROJECT_NAME_GENERATION_FAILED", "Failed to generate project name: " + e.getMessage());
        }
    }

    public String buildProjectName(Project project) {
        String justificationCode = resolveJustificationCode(project);
        String financialYear = getFinancialYear(project);
        String prefix = String.format("%s-%s-%s-", NAME_PREFIX, justificationCode, financialYear);
        int sequence = resolveSequenceNumber(project.getName(), prefix, project.getTenantId());
        return String.format("%s%03d", prefix, sequence);
    }

    /**
     * Reuses the sequence number already embedded in the project's current name when it was
     * generated for the same prefix (idempotent regeneration on update), reserves against
     * in-flight names from the current batch when present, and otherwise asks the repository
     * for the next available sequence for this prefix.
     */
    private int resolveSequenceNumber(String currentName, String prefix, String tenantId) {
        Integer existingSequence = extractSequenceIfSamePrefix(currentName, prefix);
        if (existingSequence != null) {
            return existingSequence;
        }
        Map<String, Integer> reservations = IN_FLIGHT_SEQUENCES.get();
        if (reservations != null && reservations.containsKey(prefix)) {
            int next = reservations.get(prefix) + 1;
            reservations.put(prefix, next);
            return next;
        }
        int next = projectRepository.getNextSequenceNumber(prefix, tenantId);
        if (reservations != null) {
            reservations.put(prefix, next);
        }
        return next;
    }

    private Integer extractSequenceIfSamePrefix(String existingName, String prefix) {
        if (StringUtils.isBlank(existingName)) {
            return null;
        }
        String normalized = existingName.trim().toUpperCase(Locale.ROOT);
        if (!normalized.startsWith(prefix)) {
            return null;
        }
        try {
            return Integer.parseInt(normalized.substring(prefix.length()));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public boolean isRevisedProjectIdFormat(String name) {
        return StringUtils.isNotBlank(name) && PROJECT_NAME_PATTERN.matcher(name.trim().toUpperCase(Locale.ROOT)).matches();
    }

    public boolean isValidJustificationCodeFormat(String justificationCode) {
        return StringUtils.isNotBlank(justificationCode)
                && JUSTIFICATION_CODE_PATTERN.matcher(justificationCode.trim()).matches();
    }

    public String normalizeJustificationCode(String justificationCode) {
        if (StringUtils.isBlank(justificationCode)) {
            return null;
        }
        return justificationCode.trim().toUpperCase(Locale.ROOT);
    }

    public void validateJustificationCodeFormat(String justificationCode) {
        if (!isValidJustificationCodeFormat(justificationCode)) {
            throw new CustomException("INVALID_JUSTIFICATION_CODE", JUSTIFICATION_CODE_MESSAGE);
        }
    }

    private String resolveJustificationCode(Project project) {
        String justificationCode = extractJustificationCode(project.getAdditionalDetails());
        if (StringUtils.isBlank(justificationCode)) {
            throw new CustomException("JUSTIFICATION_CODE_REQUIRED", JUSTIFICATION_CODE_MESSAGE);
        }
        validateJustificationCodeFormat(justificationCode);
        return normalizeJustificationCode(justificationCode);
    }

    public String extractJustificationCode(Object additionalDetails) {
        if (additionalDetails == null) {
            return null;
        }
        try {
            JsonNode node = additionalDetails instanceof JsonNode
                    ? (JsonNode) additionalDetails
                    : objectMapper.valueToTree(additionalDetails);
            node = normalizeAdditionalDetailsNode(node);
            if (node != null && node.isObject()
                    && node.has("justificationCode") && !node.get("justificationCode").isNull()) {
                String value = node.get("justificationCode").asText();
                return value == null || value.isBlank() ? null : value.trim();
            }
        } catch (Exception e) {
            log.error("Error reading justificationCode from additionalDetails", e);
        }
        return null;
    }

    private JsonNode normalizeAdditionalDetailsNode(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isTextual()) {
            String text = node.asText();
            if (StringUtils.isBlank(text)) {
                return null;
            }
            try {
                JsonNode parsed = objectMapper.readTree(text);
                return parsed.isObject() ? parsed : null;
            } catch (Exception e) {
                log.debug("additionalDetails is a scalar string, not JSON object: {}", text);
                return null;
            }
        }
        return node;
    }

    /**
     * Financial year: last two digits of start and end years (e.g. 2026-2027 -> 26-27).
     */
    private String getFinancialYear(Project project) {
        if (project.getStartDate() == null || project.getEndDate() == null) {
            throw new CustomException("INVALID_PROJECT_DATES", "Start date and end date are required for project name generation");
        }

        LocalDateTime startDate = LocalDateTime.ofInstant(
                Instant.ofEpochMilli(project.getStartDate()), ZoneId.systemDefault());
        LocalDateTime endDate = LocalDateTime.ofInstant(
                Instant.ofEpochMilli(project.getEndDate()), ZoneId.systemDefault());

        if (startDate.isAfter(endDate)) {
            throw new CustomException("INVALID_PROJECT_DATES", "Start date cannot be greater than end date");
        }
        if (startDate.toLocalDate().equals(endDate.toLocalDate())) {
            throw new CustomException("INVALID_PROJECT_DURATION", "Project must have a duration of at least 1 day");
        }

        int startYy = startDate.getYear() % 100;
        int endYy = endDate.getYear() % 100;
        return String.format("%02d-%02d", startYy, endYy);
    }
}
