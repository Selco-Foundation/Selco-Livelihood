package org.egov.project.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.models.project.Project;
import org.egov.project.util.MDMSUtils;
import org.egov.project.web.models.ProjectNameResult;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Project name format: &lt;Prefix&gt;-&lt;JustificationCode&gt;-&lt;FinancialYear&gt;, where the prefix
 * (e.g. "JUS") comes from MDMS. Example: JUS-98234-26-27, or JUS-98234-1-26-27 when the
 * justification code carries a version suffix. Uniqueness of (justification code, financial year)
 * per tenant is enforced by the caller (see {@code ProjectService}).
 */
@Service
@Slf4j
public class ProjectNameGenerationService {

    private static final Pattern PROJECT_NAME_PATTERN =
            Pattern.compile("^[A-Z]+-([A-Z0-9]+(?:-\\d{1,2})?)-(\\d{2})-(\\d{2})$", Pattern.CASE_INSENSITIVE);
    // Names generated before the sequence number was dropped; still valid, never regenerated.
    private static final Pattern LEGACY_PROJECT_NAME_PATTERN =
            Pattern.compile("^PROJ-([A-Z0-9]+)-(\\d{2})-(\\d{2})-(\\d{3})$", Pattern.CASE_INSENSITIVE);
    private static final Pattern JUSTIFICATION_CODE_PATTERN =
            Pattern.compile("^\\d{5}(-\\d{1,2})?$");
    // Codes stored before the 5-digit format (e.g. "SLKA"); still accepted when naming their own project.
    private static final Pattern LEGACY_JUSTIFICATION_CODE_PATTERN =
            Pattern.compile("^[A-Za-z0-9]+$");
    private static final String SCHEDULED_STATUS = "SCHEDULED";
    public static final String JUSTIFICATION_CODE_MESSAGE =
            "Justification code must be a 5-digit number, optionally followed by a dash and a "
                    + "1-2 digit numeric suffix (e.g. 12345 or 12345-1).";

    // Names claimed earlier in the same request, which aren't in the database yet.
    private static final ThreadLocal<Set<String>> IN_FLIGHT_NAMES = new ThreadLocal<>();

    private final ObjectMapper objectMapper;
    private final MDMSUtils mdmsUtils;

    public ProjectNameGenerationService(@Qualifier("objectMapper") ObjectMapper objectMapper, MDMSUtils mdmsUtils) {
        this.objectMapper = objectMapper;
        this.mdmsUtils = mdmsUtils;
    }

    public static String getScheduledStatus() {
        return SCHEDULED_STATUS;
    }

    /**
     * Opens a name-generation batch so that projects within the same request are checked for a
     * shared justification code + financial year against each other, not just the database
     * (which is only updated once the batch is persisted asynchronously).
     */
    public void beginNameGenerationBatch() {
        IN_FLIGHT_NAMES.set(new HashSet<>());
    }

    public void endNameGenerationBatch() {
        IN_FLIGHT_NAMES.remove();
    }

    public boolean isNameInFlight(String name) {
        Set<String> inFlight = IN_FLIGHT_NAMES.get();
        return inFlight != null && inFlight.contains(name);
    }

    public void markNameInFlight(String name) {
        Set<String> inFlight = IN_FLIGHT_NAMES.get();
        if (inFlight != null) {
            inFlight.add(name);
        }
    }

    public ProjectNameResult generateProjectName(Project project, RequestInfo requestInfo, boolean draft) {
        return generateProjectName(project, requestInfo, draft, null);
    }

    public ProjectNameResult generateProjectName(Project project, RequestInfo requestInfo, boolean draft,
                                               Integer facilityCountOverride) {
        log.info("Generating project name for project: {}", project.getId());
        try {
            String name = buildProjectName(project, requestInfo);
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

    public String buildProjectName(Project project, RequestInfo requestInfo) {
        String justificationCode = resolveJustificationCode(project);
        String financialYear = getFinancialYear(project);
        String rootTenantId = project.getTenantId().split("\\.")[0];
        String prefix = mdmsUtils.getJustificationCodePrefix(requestInfo, rootTenantId);
        return prefix + "-" + justificationCode + "-" + financialYear;
    }

    public boolean isRevisedProjectIdFormat(String name) {
        if (StringUtils.isBlank(name)) {
            return false;
        }
        String normalized = name.trim().toUpperCase(Locale.ROOT);
        return PROJECT_NAME_PATTERN.matcher(normalized).matches()
                || LEGACY_PROJECT_NAME_PATTERN.matcher(normalized).matches();
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
        if (!isValidJustificationCodeFormat(justificationCode)
                && !LEGACY_JUSTIFICATION_CODE_PATTERN.matcher(justificationCode.trim()).matches()) {
            throw new CustomException("INVALID_JUSTIFICATION_CODE", JUSTIFICATION_CODE_MESSAGE);
        }
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
