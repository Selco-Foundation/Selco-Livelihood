package org.egov.asset.util;

import com.jayway.jsonpath.JsonPath;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.asset.config.Configuration;
import org.egov.asset.repository.ServiceRequestRepository;
import org.egov.asset.web.models.RequestInfoWrapper;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Resolves facility manager (COMPLAINANT) from HRMS by facility boundary —
 * same binding used by im-services for Livelihood tickets.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HRMSUtil {

    public static final String ROLE_COMPLAINANT = "COMPLAINANT";
    private static final String HRMS_EMP_UUID_JSONPATH = "$.Employees.*.user.uuid";
    private static final String HRMS_EMP_NAME_JSONPATH = "$.Employees.*.user.name";
    private static final String HRMS_EMP_MOBILE_JSONPATH = "$.Employees.*.user.mobileNumber";
    /** Login id used by OAuth / E4H QR (employee code), may differ from mobile. */
    private static final String HRMS_EMP_CODE_JSONPATH = "$.Employees.*.code";
    private static final String HRMS_EMP_USERNAME_JSONPATH = "$.Employees.*.user.userName";
    private static final String STATE_BOUNDARY_TYPE = "State";

    private final ServiceRequestRepository serviceRequestRepository;
    private final Configuration configuration;

    /**
     * Finds the active COMPLAINANT at the given facility-level boundary.
     *
     * @return map with keys: uuid, name, mobile, userName, tenantId
     */
    public Map<String, String> findComplainantAtBoundary(RequestInfo requestInfo, String tenantId, String boundaryCode) {
        if (StringUtils.isBlank(boundaryCode)) {
            throw new CustomException(ErrorConstants.COMPLAINANT_NOT_FOUND_CODE, ErrorConstants.COMPLAINANT_NOT_FOUND_MSG);
        }

        StringBuilder url = new StringBuilder(configuration.getHrmsHost())
                .append(configuration.getHrmsEndPoint())
                .append("?tenantId=").append(tenantId)
                .append("&roles=").append(ROLE_COMPLAINANT)
                .append("&boundaryCodes=").append(boundaryCode.trim())
                .append("&searchOnlyInBoundary=true")
                .append("&isActive=true");

        RequestInfoWrapper wrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();
        Object response = serviceRequestRepository.fetchResult(url, wrapper, Map.class);

        try {
            List<String> uuids = JsonPath.read(response, HRMS_EMP_UUID_JSONPATH);
            if (CollectionUtils.isEmpty(uuids) || StringUtils.isBlank(uuids.get(0))) {
                throw new CustomException(ErrorConstants.COMPLAINANT_NOT_FOUND_CODE, ErrorConstants.COMPLAINANT_NOT_FOUND_MSG);
            }

            List<String> names = safeRead(response, HRMS_EMP_NAME_JSONPATH);
            List<String> mobiles = safeRead(response, HRMS_EMP_MOBILE_JSONPATH);
            List<String> codes = safeRead(response, HRMS_EMP_CODE_JSONPATH);
            List<String> userNames = safeRead(response, HRMS_EMP_USERNAME_JSONPATH);

            String loginUserName = firstNonBlank(codes);
            if (StringUtils.isBlank(loginUserName)) {
                loginUserName = firstNonBlank(userNames);
            }

            Map<String, String> complainant = new HashMap<>();
            complainant.put("uuid", uuids.get(0));
            complainant.put("name", firstNonBlank(names));
            complainant.put("mobile", firstNonBlank(mobiles));
            complainant.put("userName", loginUserName);
            complainant.put("tenantId", tenantId);
            return complainant;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse HRMS COMPLAINANT response for boundary={}", boundaryCode, e);
            throw new CustomException(ErrorConstants.HRMS_COMPLAINANT_ERROR_CODE, ErrorConstants.HRMS_COMPLAINANT_ERROR_MSG);
        }
    }

    /**
     * A vendor only sees the tickets of assets inside its jurisdictions, so the vendor user gets the state of
     * every asset it is mapped to (INDIA_KARNATAKA_RAICHUR_..._Ast/2026/001 -> INDIA_KARNATAKA), unless one of its
     * active jurisdictions already contains that asset. An inactive jurisdiction on that state is reactivated
     * rather than duplicated. HRMS is only called back when something changed.
     */
    public void addMissingStateJurisdictions(RequestInfo requestInfo, String tenantId, String vendorUserId,
                                             Collection<String> assetBoundaryCodes) {
        Set<String> boundaries = new LinkedHashSet<>();
        for (String code : assetBoundaryCodes) {
            if (StringUtils.isNotBlank(code)) {
                boundaries.add(code.trim());
            }
        }
        if (boundaries.isEmpty()) {
            return;
        }

        Map<String, Object> employee = fetchEmployeeByUuid(requestInfo, tenantId, vendorUserId);
        List<Map<String, Object>> jurisdictions = new ArrayList<>();
        Object existing = employee.get("jurisdictions");
        if (existing instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    jurisdictions.add(asStringKeyedMap(map));
                }
            }
        }

        boolean changed = false;
        for (String assetBoundary : boundaries) {
            if (isCoveredByActiveJurisdiction(assetBoundary, jurisdictions)) {
                continue;
            }
            String stateBoundary = toStateBoundaryCode(assetBoundary);
            Map<String, Object> inactiveState = jurisdictions.stream()
                    .filter(j -> stateBoundary.equalsIgnoreCase(asTrimmedString(j.get("boundary"))))
                    .findFirst()
                    .orElse(null);
            if (inactiveState != null) {
                inactiveState.put("isActive", true);
            } else {
                jurisdictions.add(buildStateJurisdiction(stateBoundary, tenantId));
            }
            changed = true;
            log.info("Adding state jurisdiction {} to vendor user {} for asset boundary {}",
                    stateBoundary, vendorUserId, assetBoundary);
        }
        if (!changed) {
            return;
        }

        employee.put("jurisdictions", jurisdictions);
        updateEmployee(requestInfo, tenantId, employee, vendorUserId);
    }

    private Map<String, Object> buildStateJurisdiction(String stateBoundary, String tenantId) {
        Map<String, Object> jurisdiction = new LinkedHashMap<>();
        jurisdiction.put("hierarchy", configuration.getBoundaryHierarchyType());
        jurisdiction.put("boundary", stateBoundary);
        jurisdiction.put("boundaryType", STATE_BOUNDARY_TYPE);
        jurisdiction.put("tenantId", tenantId);
        jurisdiction.put("isActive", true);
        jurisdiction.put("orgId", null);
        jurisdiction.put("code", null);
        jurisdiction.put("additionalDetails", null);
        return jurisdiction;
    }

    /** The asset boundary is the jurisdiction itself or one of its descendants (codes are prefixed by their parent's). */
    private boolean isCoveredByActiveJurisdiction(String assetBoundary, List<Map<String, Object>> jurisdictions) {
        String normalizedAsset = assetBoundary.toLowerCase(Locale.ROOT);
        return jurisdictions.stream()
                .filter(j -> !Boolean.FALSE.equals(j.get("isActive")))
                .map(j -> asTrimmedString(j.get("boundary")))
                .filter(StringUtils::isNotBlank)
                .map(boundary -> boundary.toLowerCase(Locale.ROOT))
                .anyMatch(boundary -> normalizedAsset.equals(boundary) || normalizedAsset.startsWith(boundary + "_"));
    }

    /** Same convention as LivelihoodPocScopeService: the state is the first two segments of a boundary code. */
    private String toStateBoundaryCode(String boundary) {
        String[] segments = boundary.trim().replace('.', '_').split("_");
        return segments.length >= 2 ? segments[0] + "_" + segments[1] : boundary.trim();
    }

    private Map<String, Object> fetchEmployeeByUuid(RequestInfo requestInfo, String tenantId, String uuid) {
        StringBuilder url = new StringBuilder(configuration.getHrmsHost())
                .append(configuration.getHrmsEndPoint())
                .append("?tenantId=").append(tenantId)
                .append("&uuids=").append(uuid);
        RequestInfoWrapper wrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();
        try {
            Map<?, ?> response = serviceRequestRepository.fetchResult(url, wrapper, Map.class);
            Object employees = response == null ? null : response.get("Employees");
            if (employees instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> employee) {
                return asStringKeyedMap(employee);
            }
        } catch (Exception e) {
            log.error("Failed to fetch vendor user {} from HRMS", uuid, e);
            throw new CustomException(ErrorConstants.VENDOR_JURISDICTION_UPDATE_ERROR_CODE,
                    ErrorConstants.VENDOR_JURISDICTION_UPDATE_ERROR_MSG);
        }
        throw new CustomException(ErrorConstants.VENDOR_JURISDICTION_UPDATE_ERROR_CODE,
                "Vendor user " + uuid + " was not found in HRMS");
    }

    /** The employee is sent back as HRMS returned it, so no field is lost on the way. */
    private void updateEmployee(RequestInfo requestInfo, String tenantId, Map<String, Object> employee, String uuid) {
        StringBuilder url = new StringBuilder(configuration.getHrmsHost())
                .append(configuration.getHrmsUpdateEndPoint())
                .append("?tenantId=").append(tenantId);
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("Employees", List.of(employee));
        try {
            Map<?, ?> response = serviceRequestRepository.fetchResult(url, body, Map.class);
            Object employees = response == null ? null : response.get("Employees");
            if (!(employees instanceof List<?> list) || list.isEmpty()) {
                throw new CustomException(ErrorConstants.VENDOR_JURISDICTION_UPDATE_ERROR_CODE,
                        ErrorConstants.VENDOR_JURISDICTION_UPDATE_ERROR_MSG);
            }
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to update jurisdictions of vendor user {} in HRMS", uuid, e);
            throw new CustomException(ErrorConstants.VENDOR_JURISDICTION_UPDATE_ERROR_CODE,
                    ErrorConstants.VENDOR_JURISDICTION_UPDATE_ERROR_MSG);
        }
    }

    private Map<String, Object> asStringKeyedMap(Map<?, ?> map) {
        Map<String, Object> result = new LinkedHashMap<>();
        map.forEach((key, value) -> result.put(String.valueOf(key), value));
        return result;
    }

    private String asTrimmedString(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }

    private List<String> safeRead(Object response, String jsonPath) {
        try {
            return JsonPath.read(response, jsonPath);
        } catch (Exception e) {
            return List.of();
        }
    }

    private String firstNonBlank(List<String> values) {
        if (CollectionUtils.isEmpty(values)) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.isNotBlank(value)) {
                return value.trim();
            }
        }
        return null;
    }
}
