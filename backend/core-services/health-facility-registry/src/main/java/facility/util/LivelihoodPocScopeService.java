package facility.util;

import com.jayway.jsonpath.JsonPath;
import facility.config.Configuration;
import facility.repository.ServiceRequestRepository;
import facility.web.models.FacilityBulkSearchCriteria;
import facility.web.models.FacilityBulkSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class LivelihoodPocScopeService {

    private static final String ROLE_LIVELIHOOD_POC = "LIVELIHOOD_POC";
    private static final String POC_ACCESS_DENIED_CODE = "POC_ACCESS_DENIED";
    private static final String POC_ACCESS_DENIED_MSG =
            "Access denied: resource is outside your assigned state jurisdiction";
    private static final String POC_JURISDICTION_MISSING_CODE = "POC_JURISDICTION_MISSING";
    private static final String POC_JURISDICTION_MISSING_MSG =
            "LIVELIHOOD_POC user has no active state jurisdiction configured in HRMS";

    private final ServiceRequestRepository serviceRequestRepository;
    private final Configuration configuration;

    public void applyFacilityBulkSearchScope(FacilityBulkSearchRequest request) {
        if (request == null || request.getRequestInfo() == null || request.getFacilityBulkSearchCriteria() == null) {
            return;
        }
        if (!isPocUser(request.getRequestInfo())) {
            return;
        }

        List<String> allowedStateBoundaries = getAllowedStateBoundaryCodes(
                request.getRequestInfo(),
                resolveTenantId(request)
        );
        if (CollectionUtils.isEmpty(allowedStateBoundaries)) {
            throw new CustomException(POC_JURISDICTION_MISSING_CODE, POC_JURISDICTION_MISSING_MSG);
        }

        FacilityBulkSearchCriteria criteria = request.getFacilityBulkSearchCriteria();
        if (!CollectionUtils.isEmpty(criteria.getState())) {
            for (String requestedState : criteria.getState()) {
                if (!isStateBoundaryAllowed(requestedState, allowedStateBoundaries)) {
                    throw new CustomException(POC_ACCESS_DENIED_CODE, POC_ACCESS_DENIED_MSG);
                }
            }
            criteria.setState(normalizeStateBoundaries(criteria.getState()));
            return;
        }

        criteria.setState(new ArrayList<>(allowedStateBoundaries));
    }

    public void assertBoundaryInScope(RequestInfo requestInfo, String tenantId, String boundaryCode) {
        if (!isPocUser(requestInfo)) {
            return;
        }
        if (StringUtils.isBlank(boundaryCode)) {
            throw new CustomException(POC_ACCESS_DENIED_CODE, POC_ACCESS_DENIED_MSG);
        }
        List<String> allowed = getAllowedStateBoundaryCodes(requestInfo, tenantId);
        if (CollectionUtils.isEmpty(allowed) || !matchesAnyStateBoundary(boundaryCode, allowed)) {
            throw new CustomException(POC_ACCESS_DENIED_CODE, POC_ACCESS_DENIED_MSG);
        }
    }

    public boolean isPocUser(RequestInfo requestInfo) {
        if (requestInfo == null || requestInfo.getUserInfo() == null
                || CollectionUtils.isEmpty(requestInfo.getUserInfo().getRoles())) {
            return false;
        }
        return requestInfo.getUserInfo().getRoles().stream()
                .map(Role::getCode)
                .anyMatch(code -> ROLE_LIVELIHOOD_POC.equalsIgnoreCase(code));
    }

    private List<String> getAllowedStateBoundaryCodes(RequestInfo requestInfo, String tenantId) {
        if (requestInfo.getUserInfo() == null || StringUtils.isBlank(requestInfo.getUserInfo().getUuid())) {
            return Collections.emptyList();
        }

        String url = configuration.getHrmsHost() + configuration.getHrmsSearchEndPoint()
                + "?tenantId=" + tenantId
                + "&uuids=" + requestInfo.getUserInfo().getUuid()
                + "&roles=" + ROLE_LIVELIHOOD_POC
                + "&isActive=true";

        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);

        Object response = serviceRequestRepository.fetchResult(new StringBuilder(url), body);
        if (response == null) {
            return Collections.emptyList();
        }

        try {
            List<Object> boundaries = JsonPath.read(response, "$.Employees[0].jurisdictions[?(@.isActive==true)].boundary");
            if (CollectionUtils.isEmpty(boundaries)) {
                boundaries = JsonPath.read(response, "$.Employees[0].jurisdictions[*].boundary");
            }
            if (CollectionUtils.isEmpty(boundaries)) {
                return Collections.emptyList();
            }
            Set<String> unique = new LinkedHashSet<>();
            for (Object boundary : boundaries) {
                if (boundary != null && StringUtils.isNotBlank(String.valueOf(boundary))) {
                    unique.add(toStateBoundaryCode(String.valueOf(boundary).trim()));
                }
            }
            return new ArrayList<>(unique);
        } catch (Exception e) {
            log.error("Failed to resolve POC jurisdictions from HRMS", e);
            throw new CustomException("HRMS_JURISDICTION_ERROR", "Failed to resolve POC state jurisdiction from HRMS");
        }
    }

    private String resolveTenantId(FacilityBulkSearchRequest request) {
        if (request.getFacilityBulkSearchCriteria().getTenantIds() != null
                && !request.getFacilityBulkSearchCriteria().getTenantIds().isEmpty()) {
            return request.getFacilityBulkSearchCriteria().getTenantIds().get(0);
        }
        if (request.getRequestInfo().getUserInfo() != null
                && StringUtils.isNotBlank(request.getRequestInfo().getUserInfo().getTenantId())) {
            return request.getRequestInfo().getUserInfo().getTenantId();
        }
        return configuration.getHrmsTenantId();
    }

    private boolean isStateBoundaryAllowed(String requestedState, List<String> allowedStateBoundaries) {
        String normalized = toStateBoundaryCode(normalizeFacilityState(requestedState));
        return allowedStateBoundaries.stream()
                .anyMatch(allowed -> allowed.equalsIgnoreCase(normalized));
    }

    private boolean matchesAnyStateBoundary(String boundaryCode, List<String> allowedStateBoundaries) {
        String normalizedBoundary = boundaryCode.trim().toLowerCase(Locale.ROOT);
        return allowedStateBoundaries.stream()
                .map(code -> toStateBoundaryCode(code).toLowerCase(Locale.ROOT))
                .anyMatch(stateBoundary -> normalizedBoundary.startsWith(stateBoundary + "_")
                        || normalizedBoundary.equals(stateBoundary));
    }

    private List<String> normalizeStateBoundaries(List<String> states) {
        return states.stream()
                .map(this::normalizeFacilityState)
                .map(this::toStateBoundaryCode)
                .distinct()
                .collect(Collectors.toList());
    }

    private String normalizeFacilityState(String facilityState) {
        if (StringUtils.isBlank(facilityState)) {
            return facilityState;
        }
        String trimmed = facilityState.trim();
        if (trimmed.contains("_")) {
            return trimmed;
        }
        return "India_" + trimmed;
    }

    private String toStateBoundaryCode(String boundary) {
        if (StringUtils.isBlank(boundary)) {
            return "";
        }
        String normalized = boundary.trim().replace('.', '_');
        String[] segments = normalized.split("_");
        if (segments.length >= 2) {
            return segments[0] + "_" + segments[1];
        }
        return normalized;
    }
}
